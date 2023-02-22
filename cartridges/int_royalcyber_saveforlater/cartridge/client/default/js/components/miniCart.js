'use strict';

var base = require('base/components/miniCart');

function showMessage(status, msg) {
    if ($('.add-to-cart-messages').length === 0) {
        $('body').append('<div class="add-to-cart-messages "></div>');
    }

    $('.add-to-cart-messages').append('<div class="add-to-basket-alert text-center ' + status + '">' + msg + '</div>');

    setTimeout(function () {
        $('.add-to-cart-messages').remove();
    }, 3000);
}

function removeSavedProduct() {
    $('body').on('click', '.remove-from-saveforlater', function (e) {
        e.preventDefault();
        var url = $(this).data('url');
        var uuid = $(this).data('uuid');

        $.spinner().start();
        $.ajax({
            url: url,
            type: 'get',
            dataType: 'json',
            success: function (data) {
                $('div.uuid-' + uuid).remove();
                $(".saveforlater-section").load(data.updateURL + " .saveforlater-section");
                $.spinner().stop();
                location.reload();
                showMessage('alert-success', data.msg);
            },
            error: function (err) {
                $.spinner().stop();
                showMessage('alert-danger', err.msg);
            }
        });
    });
}

module.exports = {
    base: base,
    removeSavedProduct: removeSavedProduct,
};
