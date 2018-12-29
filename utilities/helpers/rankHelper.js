const wObjectModel = require('../../database/schemas/wObjectSchema');

const calculateForUserWobjects = async (wobjects) => {   //wobjects - array of objects(author_permlink and weight)
    await Promise.all(wobjects.map(async (wobject) => {     //calculate user rank in each wobject
        const wobj = await wObjectModel.findOne({'author_permlink': wobject.author_permlink}).select('weight').lean();
        let rank = brierScore(wobject.weight, wobj.weight);
        if (rank < 1) {
            rank = 1;
        }
        wobject.rank = rank > 99 ? 99 : rank;
    }));
};

const calculateForUsers = async (users, totalWeight) => { //users - array of user and weight in specified wobject
    users.forEach(user => {                               //calculate rank for each user in wobject
        let rank = brierScore(user.weight, totalWeight);
        if (rank < 1) {
            rank = 1;
        }
        user.rank = rank > 99 ? 99 : rank;
    })
};

//calculate wobjects rank dependent on sum of all wobjects weight
const calculateWobjectRank = async (wobjects) => {  //calculate object rank for each in array
    const [{total_weight}] = await wObjectModel.aggregate([{$match: {weight: {$gte: 1}}},
        {
            $group: {
                _id: null,
                total_weight: {$sum: '$weight'}
            }
        }]);
    wobjects.forEach(wobject => {
        let rank = brierScore(wobject.weight, total_weight);
        if (rank < 1) {
            rank = 1;
        }
        wobject.rank = rank > 99 ? 99 : rank;
    })
};

const brierScore = (weight, totalWeight)=>{     //calculate rank by weight and total weight by brier score algorithm
    return 100 - Math.ceil(Math.pow((weight / totalWeight) - 1, 2) * 99);
};



module.exports = {calculateForUserWobjects, calculateForUsers, calculateWobjectRank};