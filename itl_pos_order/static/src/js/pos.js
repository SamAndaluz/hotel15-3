odoo.define('itl_pos_time_based_product', function(require) {
    "use strict";
    var models = require("point_of_sale.models");
    const { useListener } = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');
    const Orderline = require('point_of_sale.Orderline');
    const ProductScreen = require('point_of_sale.ProductScreen');

    models.load_fields('product.product', 'is_timer_product');

    var SuperOrderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            SuperOrderline.initialize.call(this, attr,options);
            this.hours = "00";
            this.minutes = "00";
            this.seconds = "00";
            this.play_button = false;
            this.start_time = null;
            this.stop_time = null;
        },
        init_from_JSON: function(json) {
            SuperOrderline.init_from_JSON.call(this, json);
            this.hours = json.hours;
            this.minutes = json.minutes;
            this.seconds = json.seconds;
            this.start_time = json.start_time;
            this.stop_time = json.stop_time;
            this.play_button = json.play_button;
        },
        can_be_merged_with: function(orderline){
            var self = this;
            if(orderline.product.is_timer_product){
                return false;
            }
            return SuperOrderline.can_be_merged_with.call(this, orderline);
        },
        export_as_JSON: function() {
            var dict =  SuperOrderline.export_as_JSON.call(this);
            dict.start_time = this.start_time;
            dict.stop_time = this.stop_time;
            dict.hours = this.hours;
            dict.minutes = this.minutes;
            dict.seconds = this.seconds;
            dict.total_time = this.hours+":"+this.minutes+":"+this.seconds
            return dict;
        },
        set_quantity: function(quantity, keep_price){
            var self = this;
            if(!this.play_button)
                SuperOrderline.set_quantity.call(this, quantity, keep_price);
            else{
                alert("Sorry you are not allowed to change quantity.");
            }
        },
    });

    const PosResOrderline = (Orderline) =>
        class extends Orderline {
            constructor() {
                super(...arguments);
                useListener('stop_start_order_line', this.stop_start_order_line);
            }

            async stop_start_order_line() { 
                var self = this;
                const order = this.env.pos.get_order();
                var selectedOrderLine = this.props.line;
                if(selectedOrderLine.play_button){
                    selectedOrderLine.play_button = false;
                    self.click_checkout(selectedOrderLine);
                }
                else{
                    selectedOrderLine.play_button = true;
                    self.click_checkin(selectedOrderLine);
                }
                selectedOrderLine.trigger('change',selectedOrderLine);
            }
            click_checkin(orderline){
                var self = this;
                if(!orderline.start_time)
                    orderline.start_time = new Date;
                else if(orderline.stop_time){
                    orderline.start_time = new Date(new Date - (new Date(orderline.stop_time) - new Date(orderline.start_time)));
                    orderline.stop_time = null;
                }
                else{
                    orderline.start_time = new Date(orderline.start_time);
                }
                orderline.timer_interval = setInterval(function(){
                    var total_seconds = (new Date - orderline.start_time) / 1000;
                    orderline.hours = (Math.floor(total_seconds / 3600) < 10 ? "0" : "" ) + Math.floor(total_seconds / 3600);
                    total_seconds = total_seconds % 3600;
                    orderline.minutes = ( Math.floor(total_seconds / 60) < 10 ? "0" : "" ) + Math.floor(total_seconds / 60);
                    total_seconds = total_seconds % 60;
                    orderline.seconds = ( Math.floor(total_seconds) < 10 ? "0" : "" ) + Math.floor(total_seconds);
                    var node = orderline.node;
                    orderline.trigger('change',orderline);
                }, 1000);
        }
        click_checkout(orderline){
            clearInterval(orderline.timer_interval);
            orderline.stop_time = new Date;
            if(orderline.minutes == 0){
                orderline.set_quantity(orderline.hours);
            }
            else{
                orderline.set_quantity(orderline.hours + 1);
            }
        }
    }
    Registries.Component.extend(Orderline, PosResOrderline);

    const PosResProductScreen = (ProductScreen) =>
        class extends ProductScreen {
            _onClickPay() {
                var self = this.env;
                if(self.pos.config.allow_timer_product){
                    const order = this.env.pos.get_order();
                    if(order.fast_payment){
                        this.showScreen('PaymentScreen');

                    }
                    else{
                        var orderline = order.orderlines.models;
                        var temp = true;
                        for(var i=0;i<orderline.length;i++){
                            if(orderline[i].play_button){
                                temp = false;
                                break
                            }
                        }
                        if(temp){
                            this.showScreen('PaymentScreen');
                        }else{
                            alert("Please stop the timer first.");
                        }

                    }
                }
                else{
                    this.showScreen('PaymentScreen');
                }
            }

        }
    Registries.Component.extend(ProductScreen, PosResProductScreen);
});
