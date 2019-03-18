const {ObjectType} = require('../models');

const index = async (req, res, next) => {
    const {objectTypes, error} = await ObjectType.getAll({
        limit: req.body.limit || 30,
        skip: req.body.skip || 0
    });
    if (error)
        return next(error);
    res.status(200).json(objectTypes);
};

const search = async (req, res, next) => {
    const {objectTypes, error} = await ObjectType.search({
        string: req.body.search_string,
        skip: req.body.skip || 0,
        limit: req.body.limit || 30
    });
    if (error) {
        return next(error);
    }
    res.status(200).json(objectTypes);
};

module.exports = {index, search}