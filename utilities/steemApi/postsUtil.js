const config = require('../../config');
const {Client} = require('dsteem');
const client = new Client(config.nodeUrl);

const getPostsByTrending = async (data) => {
    try {
        data.limit = !data.limit ? 10 : data.limit;
        const posts = await client.database.getDiscussions('trending', {
            limit: data.limit,
            tag: data.tag,
            start_author: data.start_author,
            start_permlink: data.start_permlink
        });
        return {posts: posts};
    } catch (error) {
        return {error};
    }
};


module.exports = {getPostsByTrending};