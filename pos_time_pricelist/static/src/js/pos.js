odoo.define('pos_time_pricelist', function (require) {
"use strict";
    var models = require('point_of_sale.models');
    var core = require('web.core');
    var _t = core._t;

    models.Product = models.Product.extend({
        get_price: function(pricelist, quantity){
        var self = this;
        var date = moment().startOf('day');

        // In case of nested pricelists, it is necessary that all pricelists are made available in
        // the POS. Display a basic alert to the user in this case.
        if (pricelist === undefined) {
            alert(_t(
                'An error occurred when loading product prices. ' +
                'Make sure all pricelists are available in the POS.'
            ));
        }

        var category_ids = [];
        var category = this.categ;
        while (category) {
            category_ids.push(category.id);
            category = category.parent;
        }

        var pricelist_items = _.filter(pricelist.items, function (item) {
            var cdate = new Date();
            var chour = cdate.getHours()
            var cmin = cdate.getMinutes();
            var total_min = (chour*60)+cmin;
            var start_hour = Math.floor(item.start_time);

            var start_min = ((item.start_time - Math.floor(item.start_time))*100)/1.67;
            var total_start_min = (start_hour*60)+start_min;
            var end_hour = Math.floor(item.end_time);
            var end_min = ((item.end_time - Math.floor(item.end_time))*100)/1.67;
            var total_end_min = (end_hour*60)+end_min;
            var temp = false;
            if(item.start_time == 0 && item.end_time == 0){
                // console.log("Testing the time>>>>>>>>>>>>>>>>>>>>>>>>>1111")
                return (! item.product_tmpl_id || item.product_tmpl_id[0] === self.product_tmpl_id) &&
                   (! item.product_id || item.product_id[0] === self.id) &&
                   (! item.categ_id || _.contains(category_ids, item.categ_id[0])) &&
                   (! item.date_start || moment(item.date_start).isSameOrBefore(date)) &&
                   (! item.date_end || moment(item.date_end).isSameOrAfter(date));
            }
            else{
                // console.log("Testing the time>>>>>>>>>>>>>>>>>>>>>>>>>22222")

                if(total_start_min <= total_min && total_end_min >= total_min){
                    temp =  true;
                }
            }

            return (! item.product_tmpl_id || item.product_tmpl_id[0] === self.product_tmpl_id) &&
                   (! item.product_id || item.product_id[0] === self.id) &&
                   (! item.categ_id || _.contains(category_ids, item.categ_id[0])) &&
                   (! item.date_start || moment(item.date_start).isSameOrBefore(date)) &&
                   (! item.date_end || moment(item.date_end).isSameOrAfter(date)) &&
                   temp;
        });

        var price = self.lst_price;
        _.find(pricelist_items, function (rule) {
            if (rule.min_quantity && quantity < rule.min_quantity) {
                return false;
            }

            if (rule.base === 'pricelist') {
                price = self.get_price(rule.base_pricelist, quantity);
            } else if (rule.base === 'standard_price') {
                price = self.standard_price;
            }

            if (rule.compute_price === 'fixed') {
                price = rule.fixed_price;
                return true;
            } else if (rule.compute_price === 'percentage') {
                price = price - (price * (rule.percent_price / 100));
                return true;
            } else {
                var price_limit = price;
                price = price - (price * (rule.price_discount / 100));
                if (rule.price_round) {
                    price = round_pr(price, rule.price_round);
                }
                if (rule.price_surcharge) {
                    price += rule.price_surcharge;
                }
                if (rule.price_min_margin) {
                    price = Math.max(price, price_limit + rule.price_min_margin);
                }
                if (rule.price_max_margin) {
                    price = Math.min(price, price_limit + rule.price_max_margin);
                }
                return true;
            }

            return false;
        });

        // This return value has to be rounded with round_di before
        // being used further. Note that this cannot happen here,
        // because it would cause inconsistencies with the backend for
        // pricelist that have base == 'pricelist'.
        return price;
    },
});

});
