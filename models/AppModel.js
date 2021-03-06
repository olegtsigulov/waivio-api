const { App } = require('database').models;

const getOne = async ({ name, bots }) => {
  try {
    const app = await App.findOne({ name }).select(bots ? {} : { service_bots: 0 }).lean();

    if (!app) {
      return { error: { status: 404, message: 'App not found!' } };
    }
    return { app };
  } catch (error) {
    return { error };
  }
};

const getAll = async () => {
  try {
    const apps = await App.find().lean();

    if (!apps || !apps.length) {
      return { error: { status: 404, message: 'App not found!' } };
    }
    return { apps };
  } catch (error) {
    return { error };
  }
};

const aggregate = async (pipeline) => {
  try {
    const result = await App.aggregate(pipeline);

    if (!result) {
      return { error: { status: 404, message: 'Not found!' } };
    }
    return { result };
  } catch (error) {
    return { error };
  }
};

const updateOne = async ({ name, updData }) => {
  try {
    const result = await App.updateOne({ name }, updData);
    return { result: !!result.nModified };
  } catch (error) {
    return { error };
  }
};

module.exports = {
  getOne, aggregate, updateOne, getAll,
};
