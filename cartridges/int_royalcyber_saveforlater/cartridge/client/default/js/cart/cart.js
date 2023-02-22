'use strict';

var base = require('base/cart/cart');
var product = require('base/product/base');

function validateBasket(data) {
    if (data.valid.error) {
        if (data.valid.message) {
            var errorHtml = '<div class="alert alert-danger alert-dismissible valid-cart-error ' +
                'fade show" role="alert">' +
                '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                '<span aria-hidden="true">&times;</span>' +
                '</button>' + data.valid.message + '</div>';

            $('.cart-error').append(errorHtml);
        } else {
            $('.cart').empty().append('<div class="row"> ' +
                '<div class="col-12 text-center"> ' +
                '<h1>' + data.resources.emptyCartMsg + '</h1> ' +
                '</div> ' +
                '</div>'
            );
            $('.number-of-items').empty().append(data.resources.numberOfItems);
            $('.minicart-quantity').empty().append(data.numItems);
            $('.minicart-link').attr({
                'aria-label': data.resources.minicartCountOfItems,
                title: data.resources.minicartCountOfItems
            });
            $('.minicart .popover').empty();
            $('.minicart .popover').removeClass('show');
        }

        $('.checkout-btn').addClass('disabled');
    } else {
        $('.checkout-btn').removeClass('disabled');
    }
}

function updateApproachingDiscounts(approachingDiscounts) {
    var html = '';
    $('.approaching-discounts').empty();
    if (approachingDiscounts.length > 0) {
        approachingDiscounts.forEach(function (item) {
            html += '<div class="single-approaching-discount text-center">'
                + item.discountMsg + '</div>';
        });
    }
    $('.approaching-discounts').append(html);
}

function updateCartTotals(data) {
    $('.number-of-items').empty().append(data.resources.numberOfItems);
    $('.shipping-cost').empty().append(data.totals.totalShippingCost);
    $('.tax-total').empty().append(data.totals.totalTax);
    $('.grand-total').empty().append(data.totals.grandTotal);
    $('.sub-total').empty().append(data.totals.subTotal);
    $('.minicart-quantity').empty().append(data.numItems);
    $('.minicart-link').attr({
        'aria-label': data.resources.minicartCountOfItems,
        title: data.resources.minicartCountOfItems
    });
    if (data.totals.orderLevelDiscountTotal.value > 0) {
        $('.order-discount').removeClass('hide-order-discount');
        $('.order-discount-total').empty()
            .append('- ' + data.totals.orderLevelDiscountTotal.formatted);
    } else {
        $('.order-discount').addClass('hide-order-discount');
    }

    if (data.totals.shippingLevelDiscountTotal.value > 0) {
        $('.shipping-discount').removeClass('hide-shipping-discount');
        $('.shipping-discount-total').empty().append('- ' +
            data.totals.shippingLevelDiscountTotal.formatted);
    } else {
        $('.shipping-discount').addClass('hide-shipping-discount');
    }

    data.items.forEach(function (item) {
        if (data.totals.orderLevelDiscountTotal.value > 0) {
            $('.coupons-and-promos').empty().append(data.totals.discountsHtml);
        }
        if (item.renderedPromotions) {
            $('.item-' + item.UUID).empty().append(item.renderedPromotions);
        } else {
            $('.item-' + item.UUID).empty();
        }
        $('.uuid-' + item.UUID + ' .unit-price').empty().append(item.renderedPrice);
        $('.line-item-price-' + item.UUID + ' .unit-price').empty().append(item.renderedPrice);
        $('.item-total-' + item.UUID).empty().append(item.priceTotal.renderedPrice);
    });
}

function appendToUrl(url, params) {
    var newUrl = url;
    newUrl += (newUrl.indexOf('?') !== -1 ? '&' : '?') + Object.keys(params).map(function (key) {
        return key + '=' + encodeURIComponent(params[key]);
    }).join('&');

    return newUrl;
}

function showMessage(status, msg) {
    if ($('.add-to-cart-messages').length === 0) {
        $('body').append('<div class="add-to-cart-messages "></div>');
    }
    
    $('.add-to-cart-messages').append('<div class="add-to-basket-alert text-center ' + status + '">' + msg + '</div>');

    setTimeout(function () {
        $('.add-to-cart-messages').remove();
    }, 3000);
}

function removeProductWithoutConfirmation(item) {
    var productID = item.productID;
    var url = item.actionUrl;
    var uuid = item.uuid;
    var urlParams = {
        pid: productID,
        uuid: uuid
    };

    url = appendToUrl(url, urlParams);

    $('body > .modal-backdrop').remove();

    $('body').trigger('cart:beforeUpdate');

    $.ajax({
        url: url,
        type: 'get',
        dataType: 'json',
        success: function (data) {
            if (data.basket.items.length === 0) {
                $('.cart').empty().append('<div class="row"> ' +
                    '<div class="col-12 text-center"> ' +
                    '<h1>' + data.basket.resources.emptyCartMsg + '</h1> ' +
                    '</div> ' +
                    '</div>'
                );
                $('.number-of-items').empty().append(data.basket.resources.numberOfItems);
                $('.minicart-quantity').empty().append(data.basket.numItems);
                $('.minicart-link').attr({
                    'aria-label': data.basket.resources.minicartCountOfItems,
                    title: data.basket.resources.minicartCountOfItems
                });
                $('.minicart .popover').empty();
                $('.minicart .popover').removeClass('show');
                $('body').removeClass('modal-open');
                $('html').removeClass('veiled');
            } else {
                if (data.toBeDeletedUUIDs && data.toBeDeletedUUIDs.length > 0) {
                    for (var i = 0; i < data.toBeDeletedUUIDs.length; i++) {
                        $('.uuid-' + data.toBeDeletedUUIDs[i]).remove();
                    }
                }
                $('.uuid-' + uuid).remove();
                if (!data.basket.hasBonusProduct) {
                    $('.bonus-product').remove();
                }
                $('.coupons-and-promos').empty().append(data.basket.totals.discountsHtml);
                updateCartTotals(data.basket);
                updateApproachingDiscounts(data.basket.approachingDiscounts);
                $('body').trigger('setShippingMethodSelection', data.basket);
                validateBasket(data.basket);
            }

            $('body').trigger('cart:update', data);
            $(".saveforlater-section").load(item.updateURL + " .saveforlater-section");
        },
        error: function (err) {
            if (err.responseJSON.redirectUrl) {
                window.location.href = err.responseJSON.redirectUrl;
            } else {
                createErrorNotification(err.responseJSON.errorMessage);
                $.spinner().stop();
            }
        }
    });
}

function removeFromCart(data) {
    var $targetElement = $('a[data-pid="' + data.pid + '"]').closest('.product-info').find('.remove-product');
    var itemToMove = {
        actionUrl: $targetElement.data('action'),
        productID: $targetElement.data('pid'),
        productName: $targetElement.data('name'),
        uuid: $targetElement.data('uuid'),
        updateURL: data.updateURL
    };

    removeProductWithoutConfirmation(itemToMove);
    var status = data.success ? 'alert-success' : 'alert-danger';
    showMessage(status, data.msg);
    $(".saveforlater-section").load(data.updateURL + " .saveforlater-section");
}

function moveToSaveForLater() {
    $('body').on('click', '.product-move .move', function (e) {
        e.preventDefault();
        var url = $(this).attr('href');
        $.spinner().start();
        $.ajax({
            url: url,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                removeFromCart(data);
                $(".saveforlater-section").load(data.updateURL + " .saveforlater-section");
                $.spinner().stop();
            },
            error: function (err) {
                removeFromCart(err);
            }
        });
    });
}

function removeProductAndUpdateSections(updateData) {
    var uuid = updateData.uuid;
    $.ajax({
        url: updateData.removeFromSavedUrl,
        type: 'get',
        success: function (data) {
            if (!data.emptySavedListMsg) {
                $('div.uuid-' + uuid).remove();
            }
            $(".saveforlater-section").load(data.updateURL + " .saveforlater-section");
            $(".cart-container").load(data.updateURL + " .cart-container");
            $(".cart-section").load(data.updateURL + " .cart-section");
            
            showMessage('alert-success', updateData.successMsg);
        },
        error: function (err) {
            $.spinner().stop();
            showMessage('alert-danger', err.msg);
        }
    });
}

function moveFromSavedToCart() {
    $('body').on('click', '.move-to-cart-saveforlater', function (e) {
        e.preventDefault();
        $('body').trigger('product:beforeAddToCart', this);

        var pid = $(this).data('pid');
        var uuid = $(this).data('uuid');
        var addToCartUrl = $(this).attr('href');
        var removeFromSavedUrl = $(this).data('action');
        var pidsQty = parseInt($(this).closest('.product-info').find('.quantity').val(), 10);
        var successMsg = $(this).data('msg');

        var form = {
            pid: pid,
            quantity: pidsQty
        };

        var updateData = {
            removeFromSavedUrl: removeFromSavedUrl,
            successMsg: successMsg,
            uuid: uuid
        };

        $.spinner().start();
        $(this).trigger('updateAddToCartFormData', form);
        if (addToCartUrl) {
            $.ajax({
                url: addToCartUrl,
                method: 'POST',
                data: form,
                success: function (data) {
                    $('body').trigger('product:afterAddToCart', data);
                    product.miniCartReportingUrl(data.reportingURL, data.error);
                    removeProductAndUpdateSections(updateData);
                    $.spinner().stop();
                },
                error: function () {
                    $.spinner().stop();
                }
            });
        }
    });
}

module.exports = {
    moveToSaveForLater: moveToSaveForLater,
    moveFromSavedToCart: moveFromSavedToCart
};
