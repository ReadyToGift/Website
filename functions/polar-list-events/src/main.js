import { Client, Databases, Users } from "node-appwrite";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
    accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? ""
});

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(req.headers["x-appwrite-key"] ?? "");
    
    const databases = new Databases(client);
    const users = new Users(client);
            
    const event = req.headers["x-appwrite-event"];
    const user = req.headers["x-appwrite-user-id"];
    const trigger = req.headers["x-appwrite-trigger"];
    const eventType = event.split(".").pop();

    if (trigger === "event" && (eventType === "create" || eventType === "delete")) {
        try {
            await polar.events.ingest({
                events: [
                    {
                        name: "listDelta",
                        externalCustomerId: user,
                        metadata: {
                            delta: eventType === "delete" ? -1 : 1
                        }
                    }
                ]
            });
            log(`Successfully ingested event to Polar for user: ${user}`);   
        } catch (err) {
            error(`Failed to ingest event to Polar: ${err.message}`);
            return res.json({
                error: `Failed to ingest event to Polar: ${err.message}`
            });
        }
    } else if (trigger === "http") {
        const lists = await databases.listDocuments(
            process.env.APPWRITE_DATABASE,
            process.env.APPWRITE_LIST_COLLECTION
        );

        const allUsers = await users.list();

        
        for (const user of allUsers.users) {
            const events = [];
            const userListDeltas = await polar.events.list({
                externalCustomerId: user.$id,
                name: "listDelta"
            });

            const userLists = lists.documents.filter((list) => list.author === user.$id);

            for (const list of userLists) {
                const existingEvent = userListDeltas.result.items.find((event) => new Date(event.timestamp).toISOString() === new Date(list.$createdAt).toISOString());
                if (!existingEvent) {
                    const event = {
                        name: "listDelta",
                        externalCustomerId: user.$id,
                        timestamp: new Date(list.$createdAt),
                        metadata: {
                            delta: 1,
                            listID: list.$id
                        }
                    };
                    events.push(event);
                }
            }

            const publicListMeters = await polar.customerMeters.list({
                externalCustomerId: user.$id,
                meterId: process.env.POLAR_PUBLIC_LIST_METER_ID
            });
            let consumedUnits = publicListMeters.result.items.reduce((acc, item) => acc + item.consumedUnits, 0); 

            
            if (events.length > 0) {
                await polar.events.ingest({
                    events
                });
                log(`Successfully ingested ${events.length} events to Polar for user: ${user.$id}`);
            };
            

            consumedUnits += events.length;

            if (consumedUnits !== userLists.length) {
                await polar.events.ingest({
                    events: [
                        {
                            name: "listDelta",
                            externalCustomerId: user.$id,
                            metadata: {
                                delta: userLists.length - consumedUnits,
                                correction: true
                            }
                        }
                    ]
                });
                log(`Corrected public list meter for user: ${user.$id} (from ${consumedUnits} to ${userLists.length})`);
            }
        }
    }

    return res.json({
        success: true
    });
};
