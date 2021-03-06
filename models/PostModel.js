const PostModel = require('database').models.Post;
const wObjectHelper = require('utilities/helpers/wObjectHelper');
const { REQUIREDFIELDS } = require('utilities/constants');
const AppModel = require('models/AppModel');
const _ = require('lodash');

exports.getAllPosts = async (data) => {
  try {
    const aggregatePipeline = [
      { $sort: { _id: -1 } },
      { $skip: data.skip },
      { $limit: data.limit },
      {
        $lookup: {
          from: 'wobjects',
          localField: 'wobjects.author_permlink',
          foreignField: 'author_permlink',
          as: 'fullObjects',
        },
      },
    ];

    if (data.filter) {
      if (data.filter.byApp) {
        const { app } = await AppModel.getOne({ name: data.filter.byApp });

        if (app && app.supported_objects.length) {
          aggregatePipeline.unshift({
            $match: {
              'wobjects.author_permlink': { $in: app.supported_objects },
            },
          });
        }
      }
    }
    const posts = await PostModel.aggregate(aggregatePipeline);

    return { posts };
  } catch (error) {
    return { error };
  }
};

exports.fillObjects = async (posts, locale = 'en-US', wobjectsPath = 'fullObjects') => {
  const fields = REQUIREDFIELDS.map((item) => ({ name: item }));

  for (const post of posts) {
    for (let wObject of _.get(post, 'wobjects', [])) {
      wObject = Object.assign(wObject, _.get(post, `[${wobjectsPath}]`, []).find((i) => i.author_permlink === wObject.author_permlink));
      wObjectHelper.formatRequireFields(wObject, locale, fields);
    }
    delete post[wobjectsPath];
  }
  return posts;
};

exports.aggregate = async (pipeline) => {
  try {
    const posts = await PostModel.aggregate(pipeline);

    if (_.isEmpty(posts)) {
      return { error: { status: 404, message: 'Posts not found!' } };
    }
    return { posts };
  } catch (error) {
    return { error };
  }
};

exports.getByFollowLists = async ({
  users, author_permlinks: authorPermlinks, skip, limit, user_languages: userLanguages, filtersData,
}) => {
  try {
    const cond = {
      $or: [{ author: { $in: users } }, { 'wobjects.author_permlink': { $in: authorPermlinks } }],
    };

    if (_.get(filtersData, 'require_wobjects')) {
      cond['wobjects.author_permlink'] = { $in: [...filtersData.require_wobjects] };
    }
    if (!_.isEmpty(authorPermlinks)) cond.language = { $in: userLanguages };
    const posts = await PostModel.find(cond)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'fullObjects', select: '-latest_posts' })
      .lean();

    if (_.isEmpty(posts)) {
      return { error: { status: 404, message: 'Posts not found!' } };
    }
    return { posts };
  } catch (error) {
    return { error };
  }
};

exports.getPostsRefs = async ({ skip = 0, limit = 1000 } = {}) => {
  try {
    return {
      posts: await PostModel.aggregate([
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            author: 1,
            permlink: 1,
            'wobjects.author_permlink': 1,
            'wobjects.percent': 1,
          },
        },
      ]),
    };
  } catch (error) {
    return { error };
  }
};

exports.getBlog = async ({ name, skip = 0, limit = 30 }) => {
  try {
    return {
      posts: await PostModel
        .find({ author: name }).sort({ _id: -1 }).skip(skip).limit(limit)
        .populate({ path: 'fullObjects', select: '-latest_posts' })
        .lean(),
    };
  } catch (error) {
    return { error };
  }
};

// eslint-disable-next-line camelcase
exports.getOne = async ({ author, permlink, root_author }) => {
  try {
    const cond = author ? { author, permlink } : { root_author, permlink };

    return { post: await PostModel.findOne(cond).lean() };
  } catch (error) {
    return { error };
  }
};

exports.findByBothAuthors = async ({ author, permlink }) => {
  try {
    return {
      result: await PostModel.find({
        $or: [{ author, permlink }, { root_author: author, permlink }],
      }).lean(),
    };
  } catch (error) {
    return { error };
  }
};

/**
 * Find and return posts by array [{author, permlink}] of posts refs
 * @param postsRefs {Array<Object>}
 * @returns {Promise<{posts: *}|{error: *}>}
 */
exports.getManyPosts = async (postsRefs) => {
  try {
    return {
      posts: await PostModel
        .find({ $or: [...postsRefs] })
        .populate({ path: 'fullObjects', select: '-latest_posts' })
        .lean(),
    };
  } catch (error) {
    return { error };
  }
};
