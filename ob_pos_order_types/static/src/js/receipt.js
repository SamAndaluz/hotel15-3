odoo.define('ob_pos_order_types.receipt', function (require) {
"use strict";

    var models = require('point_of_sale.models');
    var _super_order = models.Order.prototype;


    models.Order = models.Order.extend({
        export_for_printing: function () {
            var result = _super_order.export_for_printing.
            apply(this, arguments);
            var order_type_id = this.order_type_id.name;
            if (order_type_id) {
                result.order_type_id = order_type_id
                }
                return result;
            },

    });


});