const { UserWobjects } = require('database').models;

const aggregate = async (pipeline) => {
  try {
    const result = await UserWobjects.aggregate(pipeline);

    if (!result) {
      return { error: { status: 404, message: 'Not found!' } };
    }
    return { result };
  } catch (error) {
    return { error };
  }
};

const getByWobject = async ({
  authorPermlink, skip = 0, limit = 30, username, weight,
}) => {
  try {
    const pipeline = [
      { $match: { author_permlink: authorPermlink } },
      { $sort: { weight: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { _id: 0, name: '$user_name', weight: 1 } },
    ];

    if (username) pipeline[0].$match.user_name = username;
    if (weight) pipeline[0].$match.weight = { $gt: 0 };

    const experts = await UserWobjects.aggregate(pipeline);

    if (!experts) {
      return { error: { status: 404, message: 'Not found!' } };
    }
    return { experts };
  } catch (error) {
    return { error };
  }
};

const countDocuments = async (condition) => {
  try {
    return { count: await UserWobjects.countDocuments(condition) };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  aggregate,
  getByWobject,
  countDocuments,
};
