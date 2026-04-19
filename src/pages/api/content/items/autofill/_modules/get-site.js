const getSite = (url) => {
    const sites = {
        amazon: /https?:\/\/(www\.|smile\.)?amazon\.[a-z]{2,3}(\.[a-z]{2,3})?(\/|$)/
    };

    return Object.keys(sites).find((site) => sites[site].test(url));
};

export default getSite;