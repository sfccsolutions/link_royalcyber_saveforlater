'use strict';

function createList(customer, config) {
    var Transaction = require('dw/system/Transaction');
    var ProductListMgr = require('dw/customer/ProductListMgr');
    var list;

    Transaction.wrap(function () {
        list = ProductListMgr.createProductList(customer, config.type);
    });

    return list;
}

function getList(customer, config) {
    var productListMgr = require('dw/customer/ProductListMgr');
    var type = config.type;
    var list;
    var productLists = productListMgr.getProductLists(customer, type);
    list = productLists.length > 0 ? productLists[0] : null;

    return list;
}

function getCurrentOrNewList(customer, config) {
    var type = config.type;
    var list = getList(customer, config);
    if (list === null) {
        list = createList(customer, { type: type });
    }

    return list;
}

function itemExists(list, pid, config) {
    var listItems = list.items.toArray();
    var found = false;

    listItems.forEach(function (item) {
        if (item.productID === pid) {
            found = item;
        }
    });

    if (found && found.productOptionModel && config.optionId && config.optionValue) {
        var optionModel = found.productOptionModel;
        var option = optionModel.getOption(config.optionId);
        var optionValue = optionModel.getSelectedOptionValue(option);
        if (optionValue.ID !== config.optionValue) {
            var Transaction = require('dw/system/Transaction');
            try {
                Transaction.wrap(function () {
                    list.removeItem(found);
                });
            } catch (e) {
                return found;
            }
            found = false;
        }
    }
    return found;
}

function addItem(list, pid, config) {
    var Transaction = require('dw/system/Transaction');

    if (!list) { return false; }

    var itemExist = itemExists(list, pid, config);

    if (!itemExist) {
        var ProductMgr = require('dw/catalog/ProductMgr');

        var apiProduct = ProductMgr.getProduct(pid);

        if (apiProduct.variationGroup) { return false; }

        if (apiProduct && list && config.qty) {
            try {
                Transaction.wrap(function () {
                    var productlistItem = list.createProductItem(apiProduct);

                    if (apiProduct.optionProduct) {
                        var optionModel = apiProduct.getOptionModel();
                        var option = optionModel.getOption(config.optionId);
                        var optionValue = optionModel.getOptionValue(option, config.optionValue);

                        optionModel.setSelectedOptionValue(option, optionValue);
                        productlistItem.setProductOptionModel(optionModel);
                    }

                    if (apiProduct.master) {
                        productlistItem.setPublic(false);
                    }

                    productlistItem.setQuantityValue(config.qty);
                    productlistItem.custom.rc_outOfStock = config.rc_outOfStock;
                });
            } catch (e) {
                return false;
            }
        }
        return true;
    }
    return false;
}

function removeItem(customer, pid, config) {
    var Resource = require('dw/web/Resource');
    var list = getCurrentOrNewList(customer, config);
    var item = itemExists(list, pid, config);
    var result = {};
    if (item) {
        var Transaction = require('dw/system/Transaction');
        try {
            Transaction.wrap(function () {
                list.removeItem(item);
            });
        } catch (e) {
            result.error = true;
            result.msg = Resource.msg('saveforlater.remove.error.msg','cart',null);
            return result;
        }
        result.error = false;
    }
    return result;
}

module.exports = {
    getList: getList,
    createList: createList,
    getCurrentOrNewList: getCurrentOrNewList,
    itemExists: itemExists,
    addItem: addItem,
    removeItem: removeItem
};
