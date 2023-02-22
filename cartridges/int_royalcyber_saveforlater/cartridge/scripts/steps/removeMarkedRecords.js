'use strict';

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');

function removeMarkedRecords() {
    if (dw.system.Site.current.preferences.custom.rc_enableSaveForLater) {
        Transaction.wrap(function () {
            var coItr = CustomObjectMgr.getAllCustomObjects('rc_backInStockNotification');
            while (coItr.hasNext()) {
                var nextCO = coItr.next();
                if (nextCO.custom.rc_markAsDelete == true) {
                    CustomObjectMgr.remove(nextCO);
                }
            }
        })
    }
}

module.exports = {
    removeMarkedRecords: removeMarkedRecords
}