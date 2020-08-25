const { forwardTo } = require('prisma-binding');

const Query = {
    items: forwardTo('db'),
    itemsConnection: forwardTo('db'),
    item: forwardTo('db')
};

module.exports = Query;
