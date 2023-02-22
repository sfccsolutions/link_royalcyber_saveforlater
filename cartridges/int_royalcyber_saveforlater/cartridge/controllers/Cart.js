"use strict";

var server = require('server');
server.extend(module.superModule);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var productListHelper = require('*/cartridge/scripts/productListHelpers');
var saveForLaterProductlistType = dw.customer.ProductList.TYPE_CUSTOM_1;

server.prepend(
    'Show',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var collections = require('*/cartridge/scripts/util/collections');
        var BasketMgr = require('dw/order/BasketMgr');
        var Transaction = require('dw/system/Transaction');
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var SavedForLaterModel = require('*/cartridge/models/productList');
        var URLUtils = require('dw/web/URLUtils');
        var product = require('dw/catalog/Product');

        var productHelper = require('*/cartridge/scripts/helpers/productHelpers');

        var productsMovedToSaved = false; // variable indicating if any out of stock products were saved

        if (customer.authenticated && dw.system.Site.current.preferences.custom.rc_enableSaveForLater) {
            // iterate basket and move out of stock items to save for later
            var currentBasket = BasketMgr.getCurrentBasket();
            if (currentBasket) {
                collections.forEach(currentBasket.productLineItems, function (productLineItem) {
                    if (!productLineItem.product.availabilityModel.orderable) {
                        productsMovedToSaved = true;
                        // move to product list                
                        var list = productListHelper.getCurrentOrNewList(customer, { type: saveForLaterProductlistType });
                        var qty = productLineItem.quantityValue;
                        var pid = productLineItem.productID;
                        var optionId = productLineItem.optionID;
                        var optionVal = productLineItem.optionValueID;
                        var rc_outOfStock = true;

                        var config = {
                            qty: qty,
                            optionId: optionId,
                            optionValue: optionVal,
                            rc_outOfStock: rc_outOfStock,
                            type: saveForLaterProductlistType
                        };

                        productListHelper.addItem(list, pid, config);

                        // remove from basket
                        Transaction.wrap(function () {
                            var shipmentToRemove = productLineItem.shipment;
                            currentBasket.removeProductLineItem(productLineItem);
                            if (shipmentToRemove.productLineItems.empty && !shipmentToRemove.default) {
                                currentBasket.removeShipment(shipmentToRemove);
                            }
                        });

                        // add to custom object
                        if (!CustomObjectMgr.getCustomObject('rc_backInStockNotification', pid + customer.getProfile().getCustomerNo())) {
                            Transaction.wrap(function () {
                                var co = CustomObjectMgr.createCustomObject('rc_backInStockNotification', pid + customer.getProfile().getCustomerNo());
                                co.custom.rc_customerNo = customer.getProfile().getCustomerNo();
                                co.custom.rc_productID = pid;
                                if (co.custom.rc_notificationCount) {
                                    co.custom.rc_notificationCount++;
                                } else {
                                    co.custom.rc_notificationCount = 0;
                                }
                            });
                        }
                    }
                });
            }

            // iterate productList and move back in stock items to basket
            var currentProductList = productListHelper.getCurrentOrNewList(customer, { type: saveForLaterProductlistType });
            if (!currentProductList.items.empty) {
                collections.forEach(currentProductList.items, function (productListItem) {
                    // if a product is offline, it will delete from saved for later list
                    if (productListItem.product.online === false) {
                        var productId = productListItem.productID;
                        var quantity = productListItem.quantityValue;
                        var childProducts = [];
                        productListHelper.removeItem(customer, productId, { type: saveForLaterProductlistType });
                    }
                    else {
                        if (productListItem.custom.rc_outOfStock && productListItem.product.availabilityModel.orderable) {
                            // add back to cart
                            var productId = productListItem.productID;
                            var quantity = productListItem.quantityValue;
                            var childProducts = [];
                            var options = req.form.options ? JSON.parse(req.form.options) : [];
                            Transaction.wrap(function () {
                                cartHelper.addProductToCart(
                                    currentBasket,
                                    productId,
                                    quantity,
                                    childProducts,
                                    options
                                );
                            });

                            // remove from saved for later
                            productListHelper.removeItem(customer, productId, { type: saveForLaterProductlistType });
                        }
                    }

                });
            }
            var PAGE_SIZE_ITEMS = 15;
            var config = {
                publicView: req.querystring.publicView || false,
                pageSize: PAGE_SIZE_ITEMS,
                pageNumber: req.querystring.pageNumber || 1
            };
            var savedForLaterList = productListHelper.getList(req.currentCustomer.raw, { type: saveForLaterProductlistType });
            var savedForLaterModel = new SavedForLaterModel(savedForLaterList, config).productList;
            var viewData = res.getViewData();
            viewData.savedForLaterModel = savedForLaterModel;
            viewData.productsMovedToSaved = productsMovedToSaved;
            res.setViewData(viewData);

        }
        else if (req.querystring.fromEmail) {
            req.session.privacyCache.set('fromEmail', true);
            res.redirect(URLUtils.url('Login-Show'));
        }
        next();
    }
);

server.get('RemoveSavedProduct', function (req, res, next) {
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');

    var list = productListHelper.removeItem(req.currentCustomer.raw, req.querystring.pid, { req: req, type: saveForLaterProductlistType });

    var updateURL = URLUtils.url('Cart-Show');
    if (productListHelper.getList(req.currentCustomer.raw, { type: saveForLaterProductlistType }).items.empty) {
        var emptySavedListMsg = Resource.msg('info.savedforlater.empty.msg', 'cart', null);
    }
    if (!list.error) {
        res.json({
            success: true,
            updateURL: updateURL.toString(),
            emptySavedListMsg: emptySavedListMsg,
            msg: Resource.msg('saveforlater.remove.success.msg', 'cart', null)
        });
    } else {
        res.json({
            error: true,
            msg: list.msg
        });
    }

    next();
});

server.get('SaveProduct', function (req, res, next) {
    var collections = require('*/cartridge/scripts/util/collections');
    var Resource = require('dw/web/Resource');
    var BasketMgr = require('dw/order/BasketMgr');
    var URLUtils = require('dw/web/URLUtils');

    var requestUuid = req.querystring.uuid;
    var requestPLI = collections.find(BasketMgr.getCurrentOrNewBasket().allProductLineItems, function (item) {
        return item.UUID === requestUuid;
    });

    var list = productListHelper.getCurrentOrNewList(req.currentCustomer.raw, { type: saveForLaterProductlistType });
    if (requestPLI !== null) {
        var qty = requestPLI.quantityValue;
        var pid = requestPLI.productID;
        var optionId = requestPLI.optionID;
        var optionVal = requestPLI.optionValueID;
        var rc_outOfStock = false;
        var config = {
            qty: qty,
            optionId: optionId,
            optionValue: optionVal,
            rc_outOfStock: rc_outOfStock,
            type: saveForLaterProductlistType
        };

        var errMsg = productListHelper.itemExists(list, pid, config) ? Resource.msg('saveforlater.move.exist.msg', 'cart', null) :
            Resource.msg('saveforlater.move.failure.msg', 'cart', null);

        var success = productListHelper.addItem(list, pid, config);

        var updateURL = URLUtils.url('Cart-Show');

        if (success) {
            res.json({
                statusCode: 200,
                success: true,
                pid: pid,
                updateURL: updateURL.toString(),
                msg: Resource.msg('saveforlater.move.success.msg', 'cart', null)
            });
        } else {
            res.json({
                error: true,
                pid: pid,
                msg: errMsg
            });
        }
    }
    else {
        res.json(
            {
                statusCode: 25,
                success: true,
                msg: Resource.msg('saveforlater.move.basketerror.msg', 'cart', null)
            }
        );
    }

    next();
});

server.prepend('MiniCartShow', function (req, res, next) {
    var SavedForLaterModel = require('*/cartridge/models/productList');
    var PAGE_SIZE_ITEMS = 15;
    var config = {
        publicView: req.querystring.publicView || false,
        pageSize: PAGE_SIZE_ITEMS,
        pageNumber: req.querystring.pageNumber || 1
    };
    if (customer.authenticated && dw.system.Site.current.preferences.custom.rc_enableSaveForLater) {
        var savedForLaterList = productListHelper.getList(req.currentCustomer.raw, { type: saveForLaterProductlistType });
        var savedForLaterModel = new SavedForLaterModel(savedForLaterList, config).productList;
        var viewData = res.getViewData();
        viewData.savedForLaterModel = savedForLaterModel;
        res.setViewData(viewData);
    }

    next();
});

server.get(
    'Itemsdetails',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var collections = require('*/cartridge/scripts/util/collections');
        var BasketMgr = require('dw/order/BasketMgr');
        var Transaction = require('dw/system/Transaction');
        var cartHelper = require('*/cartridge/scripts/cart/cartHelpers');
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var SavedForLaterModel = require('*/cartridge/models/productList');
        var URLUtils = require('dw/web/URLUtils');
        var product = require('dw/catalog/Product');

        var productHelper = require('*/cartridge/scripts/helpers/productHelpers');

        var productsMovedToSaved = false; // variable indicating if any out of stock products were saved

        if (customer.authenticated && dw.system.Site.current.preferences.custom.rc_enableSaveForLater) {
            // iterate basket and move out of stock items to save for later
            var currentBasket = BasketMgr.getCurrentBasket();
            if (currentBasket) {
                collections.forEach(currentBasket.productLineItems, function (productLineItem) {
                    if (!productLineItem.product.availabilityModel.orderable) {
                        productsMovedToSaved = true;

                        // move to product list                
                        var list = productListHelper.getCurrentOrNewList(customer, { type: saveForLaterProductlistType });
                        var qty = productLineItem.quantityValue;
                        var pid = productLineItem.productID;
                        var optionId = productLineItem.optionID;
                        var optionVal = productLineItem.optionValueID;
                        var rc_outOfStock = true;

                        var config = {
                            qty: qty,
                            optionId: optionId,
                            optionValue: optionVal,
                            rc_outOfStock: rc_outOfStock,
                            type: saveForLaterProductlistType
                        };

                        productListHelper.addItem(list, pid, config);

                        // remove from basket
                        Transaction.wrap(function () {
                            var shipmentToRemove = productLineItem.shipment;
                            currentBasket.removeProductLineItem(productLineItem);
                            if (shipmentToRemove.productLineItems.empty && !shipmentToRemove.default) {
                                currentBasket.removeShipment(shipmentToRemove);
                            }
                        });

                        // add to custom object
                        if (!CustomObjectMgr.getCustomObject('rc_backInStockNotification', pid + customer.getProfile().getCustomerNo())) {
                            Transaction.wrap(function () {
                                var co = CustomObjectMgr.createCustomObject('rc_backInStockNotification', pid + customer.getProfile().getCustomerNo());
                                co.custom.rc_customerNo = customer.getProfile().getCustomerNo();
                                co.custom.rc_productID = pid;
                                if (co.custom.rc_notificationCount) {
                                    co.custom.rc_notificationCount++;
                                } else {
                                    co.custom.rc_notificationCount = 0;
                                }
                            });
                        }
                    }
                });
            }

            // iterate productList and move back in stock items to basket
            var currentProductList = productListHelper.getCurrentOrNewList(customer, { type: saveForLaterProductlistType });
            if (!currentProductList.items.empty) {
                collections.forEach(currentProductList.items, function (productListItem) {
                    // if a product is offline, it will delete from saved for later list
                    if (productListItem.product.online === false) {
                        var productId = productListItem.productID;
                        var quantity = productListItem.quantityValue;
                        var childProducts = [];
                        productListHelper.removeItem(customer, productId, { type: saveForLaterProductlistType });
                    }
                    else {
                        if (productListItem.custom.rc_outOfStock && productListItem.product.availabilityModel.orderable) {
                            // add back to cart
                            var productId = productListItem.productID;
                            var quantity = productListItem.quantityValue;
                            var childProducts = [];
                            var options = req.form.options ? JSON.parse(req.form.options) : [];
                            Transaction.wrap(function () {
                                cartHelper.addProductToCart(
                                    currentBasket,
                                    productId,
                                    quantity,
                                    childProducts,
                                    options
                                );
                            });

                            // remove from saved for later
                            productListHelper.removeItem(customer, productId, { type: saveForLaterProductlistType });
                        }
                    }

                });
            }
            var PAGE_SIZE_ITEMS = 15;
            var config = {
                publicView: req.querystring.publicView || false,
                pageSize: PAGE_SIZE_ITEMS,
                pageNumber: req.querystring.pageNumber || 1
            };
            var savedForLaterList = productListHelper.getList(req.currentCustomer.raw, { type: saveForLaterProductlistType });
            var savedForLaterModel = new SavedForLaterModel(savedForLaterList, config).productList;
            var viewData = res.getViewData();
            viewData.savedForLaterModel = savedForLaterModel;
            viewData.productsMovedToSaved = productsMovedToSaved;
            res.setViewData(viewData);

        } else if (req.querystring.fromEmail) {
            req.session.privacyCache.set('fromEmail', true);
            res.redirect(URLUtils.url('Login-Show'));
        }
        var CartModel = require('*/cartridge/models/cart');
        var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
        var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
        var currentBasket = BasketMgr.getCurrentBasket();
        var reportingURLs;
        if (currentBasket) {
            Transaction.wrap(function () {
                if (currentBasket.currencyCode !== req.session.currency.currencyCode) {
                    currentBasket.updateCurrency();
                }
                cartHelper.ensureAllShipmentsHaveMethods(currentBasket);

                basketCalculationHelpers.calculateTotals(currentBasket);
            });
        }

        if (currentBasket && currentBasket.allLineItems.length) {
            reportingURLs = reportingUrlsHelper.getBasketOpenReportingURLs(currentBasket);
        }

        res.setViewData({ reportingURLs: reportingURLs });

        var basketModel = new CartModel(currentBasket);
        res.render('saveforlater/saveforlaterLanding', basketModel);

        next();
    }
);

module.exports = server.exports();