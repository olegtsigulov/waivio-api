const {client} = require('./steem');

const getAccount = async (name) => {
    try {
        const [account] = await client.database.getAccounts([name]);
        return {userData: account};
    } catch (error) {
        return {error}
    }
};


module.exports = {getAccount};