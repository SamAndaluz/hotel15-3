odoo.define('itl_pos_order.POSValidateOverride', function(require) {
    'use strict';

    //Button - Checkout
    var rpc = require('web.rpc');
//     var Model = require('web.Model');
    
    const { Gui } = require('point_of_sale.Gui');
    const { posbus } = require('point_of_sale.utils');
    const NumberBuffer = require('point_of_sale.NumberBuffer');
    
    const { useListener } = require('web.custom_hooks');
    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const TicketScreen = require('point_of_sale.TicketScreen');
    const FloorScreen = require('pos_restaurant.FloorScreen');

    //Timer
    const models = require('point_of_sale.models');
    models.load_fields('product.product', ['x_studio_temporizador_templ', 'order_type_id']);
    models.load_fields('restaurant.table', ['room_id']);

    var _super_order = models.Order;
    
    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const Registries = require('point_of_sale.Registries');
    const Orderline = require('point_of_sale.Orderline');

    var _order;
    var _room_id;
    
    // **** Checkout Button ****
    class CheckOutButton extends PosComponent {
        
        constructor() {
            super(...arguments);
            useListener('click', this._onClick);
        }
        
        _onClick() {

            var new_hk;
            
            console.log("_onClick ... House Keeping ......");
            
            _order = this.env.pos.get_order();
            console.log("_order");
            console.log(_order);

            _room_id = _order.table.room_id[0];
            
            var _payments = _order.get_paymentlines();
            console.log("Payments List ....");
            console.log(_payments);
                
            if (_payments.length > 1) {
                console.log("Ordem com mais de um pagamento ....");
            } else {
                var is_done = true;
                
                // Payment Lines
                _payments.forEach(function(pl){
                    console.log("pl");
                    console.log(pl);
                    if (!pl.is_done()) _order.remove_paymentline(pl);
//                     var is_done = pl.payment_done();
                });

                // Order lines
                _order.get_orderlines().forEach(function (orderline) {
                    clearInterval(orderline.timer_interval);
                    console.log("Calling remove_orderline");
                    _order.remove_orderline(orderline);
                });

                // Order
                var my_table = _order.table;
                console.log("my_table");
                console.log(my_table);
                
                if (_order) {
                    console.log("Calling finalize order");
                    _order.destroy({'reason':'abandon'});
//                     _order.delete_current_order();
                    _order.finalize();
                    my_table.color = undefined;
                }
                
                // Register a new HouseKeeping task after Checkout
                console.log("Creating Housekeeping.....");
                new_hk = rpc.query({
                    model: 'hotel.housekeeping',   // your model 
                    method: 'create_new_activity',   //read data or another function
                    args: [_room_id],  //args, first id of record, and array another args

                 }).then(function(result){
                    console.log(result); //your code when data read
                 });      
                
                if (!new_hk) {
                    console.log("Nao foi possivel criar uma nova atividade de HouseKeeping")
                }
                console.log("Going back to FloorScreen .....");
                this.showScreen('FloorScreen');
//                 return FloorScreen;
            }
            
        }
    }
    CheckOutButton.template = 'CheckoutButton';

    ProductScreen.addControlButton({
        component: CheckOutButton,
        condition: function () {
            return true;
        },
    });
    Registries.Component.add(CheckOutButton);

    // **** End ****

    //
    // Pos Model Extended Function
    //
    var exports = {};

    
    var _super_posmodel = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({
        // creates a new empty order and sets it as the current order
        add_new_order: function(options){
            console.log("Calling Custom add_new_order .....");
            console.log("Options ...");
            console.log(options);
            var defaultOrderType = {'id': 1, 'name': 'Normal'};
            
            if (options) {
                console.log(options['order_type_id']);
                if (options['order_type_id'] == undefined) {
                    options = {'order_type_id': {'id': 1, 'name': 'Normal'}};
                } else {
                    defaultOrderType = options['order_type_id'];
                }
            } else {
                options = {'order_type_id': {'id': 1, 'name': 'Normal'}};
            }
            
            console.log("New options......");
            console.log(options);
            
            var order = _super_posmodel.add_new_order.apply(this,options);
//             var order = new exports.Order({},{pos:this});
//             this.get('orders').add(order);
//             this.set('selectedOrder', order, options);
            if (order.order_type_id == undefined || order.order_type_id == false) {
                console.log("Setting default Order Type .....");
                order.set_order_type(defaultOrderType); // Index 0: Normal / 1: Timer
            }
            console.log("Returning Order");
            console.log(order);
            
            order.save_to_db();
            return order;
        },
        add_product: function(product, options){
            console.log("PosModel: Calling Custom add_product .....");
//             if(this._printed){
//                 this.destroy();
//                 return this.pos.get_order().add_product(product, options);
//             }
//             this.assert_editable();
//             options = options || {};
//             var line = new exports.Orderline({}, {pos: this.pos, order: this, product: product});
            var line = _super_posmodel.add_product.apply(this, product, options);
            console.log("Line");
            console.log(line);
//             this.fix_tax_included_price(line);

//             this.set_orderline_options(line, options);

//             var to_merge_orderline;
//             for (var i = 0; i < this.orderlines.length; i++) {
//                 if(this.orderlines.at(i).can_be_merged_with(line) && options.merge !== false){
//                     to_merge_orderline = this.orderlines.at(i);
//                 }
//             }
//             if (to_merge_orderline){
//                 to_merge_orderline.merge(line);
//                 this.select_orderline(to_merge_orderline);
//             } else {
//                 this.orderlines.add(line);
//                 this.select_orderline(this.get_last_orderline());
//             }

//             if (options.draftPackLotLines) {
//                 this.selected_orderline.setPackLotLines(options.draftPackLotLines);
//             }
//             if (this.pos.config.iface_customer_facing_display) {
//                 this.pos.send_current_order_to_customer_facing_display();
//             }
        },        
//         on_removed_order: function(removed_order,index,reason){
//             console.log("Calling Custom on_removed_order .....");
//             console.log(removed_order);
//             var order_list = this.get_order_list();
//             if( (reason === 'abandon' || removed_order.temporary) && order_list.length > 0){
//                 // when we intentionally remove an unfinished order, and there is another existing one
//                 this.set_order(order_list[index] || order_list[order_list.length - 1], { silent: true });
//             }else{
//                 // when the order was automatically removed after completion,
//                 // or when we intentionally delete the only concurrent order
//                 this.add_new_order({ silent: true });
//             }
//             // Remove the link between the refund orderlines when deleting an order
//             // that contains a refund.
//             for (const line of removed_order.get_orderlines()) {
//                 if (line.refunded_orderline_id) {
//                     delete this.toRefundLines[line.refunded_orderline_id];
//                 }
//             }
//         },
        
    });
    
    
    //
    // Payment Model Extended Function
    //
    var SuperPaymentline = models.Paymentline.prototype;
    models.Paymentline = models.Paymentline.extend({
        payment_done: function(){
            var self = this;
            console.log("Calling ITL: Paymentline extend payment_done function ....")
            this.set_payment_status('done');
            this.remove_paymentline();
            
            return true;
        },
    });

    //
    // Order Model Extended Function
    //
    var SuperOrder = models.Order.prototype;
    models.Order = models.Order.extend({
        set_order_type: function(order_type) {
            const order_type_id = this.pos.order_type_ids
//             console.log("order_type_id")
//             console.log(order_type_id)
//             console.log(order_type_id[order_type])
//             this.order_type_id = order_type_id[order_type];
            this.order_type_id = order_type;
        },
        get_timer_line: function(order_type){
            var self = this;
            var my_total_time = false ;
//             const order = self.get_order();
            console.log("Running timer_line ......");
//             console.log(self.order_type_id)
//                 this.click_checkin(this);
            if (order_type == 'Time') {
                self.get_orderlines().forEach(function(orderline){
                    console.log("Is timer .....");
                    console.log(orderline);
                    my_total_time=orderline.total_time;
                });
            }
            if (my_total_time !== false) {
                return my_total_time;
            } else {
                console.log("Is not a timer .....");
                return "";
            }
//             return this;
        },
        
    });
    
    //
    // OrderLine Model Extended Function
    //
    var SuperOrderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            SuperOrderline.initialize.call(this, attr,options);
            this.timer_expiration = undefined;
        },
        init_from_JSON: function(json) {
            SuperOrderline.init_from_JSON.call(this, json);
            this.timer_expiration = json.timer_expiration;
        },
        export_as_JSON: function() {
            var dict =  SuperOrderline.export_as_JSON.call(this);
            return dict;
        },
        update_total_time: function() {
            this.total_time = this.hours+":"+this.minutes+":"+this.seconds
            console.log("New total_time");
            console.log(this.total_time);

        },
        start_timer: function(){
            console.log("Calling ITL: OrderLine extend start_timer function ....");
            var self = this;
            
//             console.log('with ms', Date.now() + (30 * 60 * 1000));
//             console.log('new Date', new Date(Date.now() + (30 * 60 * 1000)));
            
            var my_period_time = this.product.get_unit();
            console.log("my_period_time");
            console.log(my_period_time);
            var period_ratio = undefined;
//          if (my_period_time.category_type[1] != 'Time') {
//              console.log("Unidade de medida do produto nao esta definida como tempo");
//          } else {
            period_ratio = my_period_time.ratio * 60;// Ratio should be in Hours, so we need to convert it to minutes
            // **** FORCE PERIOD RATIO ONLY FOR TEST ***
            period_ratio = 1 * 60 ;  // 1 min
            
            this.timer_expiration = Date.now() + (period_ratio * 60 * 1000);
            
            console.log("period_ratio");
            console.log(period_ratio);
//          }
            
//             var _date_expire = new Date(Date.now() + (period_ratio * 60 * 1000));
            var _date_expire = Date.now() + (period_ratio * 60 * 1000);
            console.log("Date Expire");
            console.log(_date_expire);
            
//             var _date_expire_alert = new Date(Date.now() + ((period_ratio - 5) * 60 * 1000));
            var _date_expire_alert = _date_expire - ((period_ratio - 5) * 60 * 1000);
            console.log("Date Expire Alert");
            console.log(_date_expire_alert);
                
            this.stop_start_order_line();
        },
        timer_expiration_date: function() {
            return this.timer_expiration;
        },
        timer_expiration_alert_date: function() {
            var my_period_time = this.product.get_unit();
            var _period_ratio = my_period_time.ratio * 60;    // Ratio should be in Hours, so we need to convert it to minutes
            
            // **** FORCE PERIOD RATIO ONLY FOR TEST ***
            _period_ratio = 1 * 60 ;  // 1 hour
            
//             return this.timer_expiration - ((_period_ratio - 5) * 60 * 1000);
            return this.timer_expiration - ((_period_ratio - 5) * 60 * 1000);
        },
        stop_start_order_line: function() { 
                var self = this;
                const order = this.pos.get_order();
                var selectedOrderLine = this;
                console.log("Calling stop_start_order_line");
                console.log(selectedOrderLine);
                if(selectedOrderLine.play_button){
                    selectedOrderLine.play_button = false;
                    self.click_checkout(selectedOrderLine);
                }
                else{
                    selectedOrderLine.play_button = true;
                    self.click_checkin(selectedOrderLine);
                }
                selectedOrderLine.trigger('change',selectedOrderLine);
        },
        click_checkin: function(orderline){
                console.log("Calling click_checkin");
                var myIntervalDefault = 1000;   // 300000 = 5min
                var self = this;
                const _order = this.pos.get_order();
                var expire_retry = true;
                var timeRetry = 300;
                var expired = false;
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
                    
                    // Refresh total time
                    orderline.update_total_time();

                    console.log("Total Seconds:    ", (Date.now() + (total_seconds * 1000)));
                    console.log("Timer Expiration: ", orderline.timer_expiration_date());
                    console.log("Timer Exp. Alert: ", orderline.timer_expiration_alert_date());
                    
                    if ((Date.now() + (total_seconds * 1000)) >= orderline.timer_expiration_date()) 
                    {
//                         if (expired == false) {
                        if (expire_retry && timeRetry >= 300) {
                            timeRetry = 0;
                            expire_retry = false;
                            console.log("*** ALERTA DE PERIODO EXPIRADO ****");
                            if (_order.table.color != "red") {
                                _order.table.color = "red";
                            }
                            Gui.showPopup('ConfirmPopup', {
                                title: 'Time expired',
                                body: 'Room '+ _order.table.name + ' Time expired' +
                                '(Click on cancel to be reminded in 5 minutes)',
                            }).then(function(action) {
                                console.log(action);
                                if (action.confirmed) {
                                    expire_retry = false;
                                    console.log("Confirmed");
                                    orderline.click_checkout();
                                } else {
                                    expire_retry = true;
                                    console.log("Cancelled");
                                }
                            });
//                             return true;
                        } else {
                            timeRetry = timeRetry + 1;
                            console.log("TimeRetry: " + timeRetry);
                        }
//                         }
                    } else if ((Date.now() + (total_seconds * 1000)) >= orderline.timer_expiration_alert_date()) 
                    {
                        if (expire_retry && timeRetry >= 300) {
                            console.log("*** ALERTA DE PERIODO A EXPIRAR ****");
                            timeRetry = 0;
                            expire_retry = false;
//                         console.log(expire_retry);
                            if (_order.table.color != "orange") {
                                _order.table.color = "orange";
//                                 _order.table.render();
                            }
                            Gui.showPopup('ConfirmPopup', {
                                title: 'Time to expire',
                                body: 'Room '+ _order.table.name + ' time will expire in 5 minutes' +
                                    '(Click on cancel to be reminded in 5 minutes)',
                            }).then(function(action) {
                                console.log(action);
                                if (action.confirmed) {
                                    expire_retry = false;
                                    console.log("Confirmed");
                                } else {
                                    expire_retry = true;
                                    console.log("Cancelled");
                                }
                            });
//                             return true;
                        } else {
                            timeRetry = timeRetry + 1;
                            console.log("TimeRetry: " + timeRetry);
                        }
                    };

                    var node = orderline.node;
                    orderline.trigger('change',orderline);
                }, myIntervalDefault);
        },
        click_checkout: function(orderline){
            console.log("Calling click_checkout");
            clearInterval(orderline.timer_interval);
            orderline.stop_time = new Date;
            if(orderline.minutes == 0){
                orderline.set_quantity(orderline.hours);
            }
            else{
                orderline.set_quantity(orderline.hours + 1);
            }
        },        
    });


    //
    //  Product Screen
    //
    const ProductOverride = ProductScreen =>
        class extends ProductScreen {
            constructor() {
                console.log("Calling ITL: ProductOverride Super constructor ....");
                super(...arguments);
                console.log("this ProductOverride .....");
                console.log(this);
            }
            async _clickProduct(event) {
                console.log("Calling ITL: Custom _clickProduct ....");
                console.log("this.currentOrder");
                console.log(this.currentOrder);
                if (!this.currentOrder) {
                    this.env.pos.add_new_order();
                }
                
//                 super._clickProduct(event);
                const product = event.detail;
                const options = await this._getAddProductOptions(product);

                // Do not add product if options is undefined.
                if (!options) return;
                
                if (this.currentOrder.order_type_id == 'Time') {
                    console.log("Is a CurrentOrder type = Time");
                    
                    var new_order = this.env.pos.add_new_order();
                    // Add the product after having the extra information.
                    new_order.add_product(product, options);
                } else {
                    // Add the product after having the extra information.
                    this.currentOrder.add_product(product, options);
                }
                NumberBuffer.reset();
            }
            
        };
    Registries.Component.extend(ProductScreen, ProductOverride);

    //
    //  Ticket Screen
    //
    const TicketOverride = TicketScreen =>
        class extends TicketScreen {
            constructor() {
                console.log("Calling ITL: TicketOverride Super constructor ....");
                super(...arguments);
                console.log("this TicketOverride .....");
                console.log(this);

                useListener('update_timer_screen', this.update_timer_screen);
                
            }
            
            /// Override function and always hide de Delete Button
            shouldHideDeleteButton(order) {
                console.log("Calling overrided function shouldHideDeleteButton");
//                 return false;
                if (this.getOrderType(order) == 'Time') {
                   return true;
                } else {
                   return false;
                }
            }
            
            hasTimer(order) {
//                 console.log("hasTimer: order");
//                 console.log(order);
//                 if (this.getOrderType(order) == 'Time') {
                   return true;
//                 } else {
//                    return false;
//                 }
            }
            
            getOrderType(order) {
                console.log("getOrderType: order");
                console.log(order);
                //if order.order_type_id
                return order.order_type_id.name
            }

            async update_timer_screen() {
                var self = this;
                const order = this.env.pos.get_order_list();
                var _timer;
                console.log("Running getTimer.....");
                console.log(order);
                order.forEach(function(o){
                    if (order.order_type_id.name == 'Time') {
                        _timer=setInterval(function(){
                            o.trigger('change', o);
                        }, 5000);
                    }
                });
            }
            
            getTimer(order) {
                
                var timer; 
                
                console.log("Running getTimer.....");
                console.log(order);
                if (order.order_type_id.name == 'Time') {
                        timer = order.get_timer_line(order.order_type_id.name);
                } else {
                    timer = order.get_timer_line(order.order_type_id.name);
                }
                
                console.log("Returning Timer: " + timer);
                return timer ////"00:00:00";
            }
            
            async _onDeleteOrder({ detail: order }) {
                console.log("Calling Custom _onDeleteOrder .....")
                const screen = order.get_screen_data();
                if (['ProductScreen', 'PaymentScreen'].includes(screen.name) && order.get_orderlines().length > 0) {
                    console.log("MyOrder");
                    console.log(order);
                    if (order.order_type_id.name == 'Time') {
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Remove Order'),
                            body: this.env._t("You cant remove order with type Time, please execute the Checkout to close this order!"),
                        });
                        return;
                    } else {
                        const { confirmed } = await this.showPopup('ConfirmPopup', {
                            title: 'Existing orderlines',
                            body: `${order.name} has total amount of ${this.getTotal(
                                order
                            )}.\n Are you sure you want delete this order?`,
                        });
                        if (!confirmed) return;
                    }
                }
                if (order && (await this._onBeforeDeleteOrder(order))) {
                    order.destroy({ reason: 'abandon' });
                    posbus.trigger('order-deleted');
                }
            }
            
            
        };
    Registries.Component.extend(TicketScreen, TicketOverride);
    
    //
    //  Floor Screen
    //
    const PosFloorOverride = FloorScreen =>
        class extends FloorScreen {
            constructor() {
                console.log("Calling ITL: PosFloorOverride Super constructor ....");
                super(...arguments);
                console.log("this PosFloorOverride .....");
                console.log(this);
            }
//             async _clickProduct(event) {
//                 console.log("_clickProduct");
//                 if (!this.currentOrder) {
//                     this.env.pos.add_new_order();
//                 }
//                 const product = event.detail;
//                 const options = await this._getAddProductOptions(product);
//                 // Do not add product if options is undefined.
//                 if (!options) return;
//                 // Add the product after having the extra information.
//                 this.currentOrder.add_product(product, options);
//                 NumberBuffer.reset();
//             }
            
        };
    Registries.Component.extend(FloorScreen, PosFloorOverride);
    
    //
    //  Order Line Screen
    //
    const PosResOrderlineOverride = (Orderline) =>
        class extends Orderline {
            constructor() {
                console.log("Calling ITL: PosResOrderlineOverride Super constructor ....");
                super(...arguments);
                console.log("this PosResOrderLineOverride .....");
                console.log(this);

                useListener('stop_start_order_line', this.stop_start_order_line);
                
                this.check_timer();
            }
            
            async stop_start_order_line() { 
                var self = this;
                const order = this.env.pos.get_order();
                var selectedOrderLine = this.props.line;
                console.log("Calling stop_start_order_line");
                console.log(selectedOrderLine);
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
            check_timer(){
                console.log("Calling Check Timer");
                var self = this;
                const order = self.env.pos.get_order();
                var selectedOrderLine = self.props.line;
                console.log(selectedOrderLine);
                if (self.seconds) {
                    console.log("*** Already started the timer ****");
                }
            }
            click_checkin(orderline){
                console.log("Calling click_checkin");
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
                    
// //                     console.log("Updating timer ....");
// //                     console.log("Start time: ", orderline.start_time);
//                     console.log("Total Seconds:    ", (Date.now() + (total_seconds * 1000)))
//                     console.log("Timer Expiration: ", orderline.timer_expiration_date());
//                     console.log("Timer Exp. Alert: ", orderline.timer_expiration_alert_date());
                    
//                     if ((Date.now() + (total_seconds * 1000)) >= orderline.timer_expiration_date()) 
//                     {
//                             console.log("*** ALERTA DE PERIODO EXPIRADO!!!! ****")
//                             if (orderline.get_order().table.color != "red") {
//                                 orderline.get_order().table.color = "red";
//                             }
//                     } else if ((Date.now() + (total_seconds * 1000)) >= orderline.timer_expiration_alert_date()) 
//                     {
//                             console.log("*** ALERTA DE PERIODO A EXPIRAR ****")
//                             if (orderline.order.table.color != "orange") {
//                                 orderline.get_order().table.color = "orange";
//                             }
//                     }

                }, 1000);
        }
        click_checkout(orderline){
            console.log("Calling click_checkout");
            clearInterval(orderline.timer_interval);
            orderline.stop_time = new Date;
            if(orderline.minutes == 0){
                orderline.set_quantity(orderline.hours);
            }
            else{
                orderline.set_quantity(orderline.hours + 1);
            }
        }
    };
    Registries.Component.extend(Orderline, PosResOrderlineOverride);

    //
    //  Payment Screen
    //
    const POSValidateOverride = PaymentScreen =>
        class extends PaymentScreen {
            
            /**
             * @override
             */
            async validateOrder(isForceValidate) {
                if(this.env.pos.config.cash_rounding) {
                    if(!this.env.pos.get_order().check_paymentlines_rounding()) {
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Rounding error in payment lines'),
                            body: this.env._t("The amount of your payment lines must be rounded to validate the transaction."),
                        });
                        return;
                    }
                }
                if (await this._isOrderValid(isForceValidate)) {
                    
                    // remove pending payments before finalizing the validation
                    for (let line of this.paymentLines) {
                        if (!line.is_done()) this.currentOrder.remove_paymentline(line);
                    }
                    await this._finalizeValidation();
                    
                    var order = this.env.pos.get_order();
                    var env = this.env

                    var has_timer_product = false;
                    var timer_product = false;
                    var timer = false;
                    order.get_orderlines().forEach(function (orderline) {
                        if (orderline.product.x_studio_temporizador_templ !== false) {
                            timer_product = orderline.product.x_studio_temporizador_templ;
                            if (timer_product !== undefined && timer_product !== false) {
                                timer = env.pos.db.get_product_by_id(timer_product[0]);
                                console.log("Timer ordertype: " + timer.order_type_id);
                            }
                        }
                    });
                    
                    var new_order = false;
                    if (timer_product !== false) {
                        console.log("*** Timer not equal False ***");
                        console.log(timer.order_type_id);
                        console.log({'order_type_id': {'id': timer.order_type_id[0], 'name': timer.order_type_id[1]}});
                        new_order = this.env.pos.add_new_order({'order_type_id': {'id': timer.order_type_id[0], 'name': timer.order_type_id[1]}});
                    } else {
                        new_order = this.env.pos.add_new_order({'order_type_id': {'id': 1, 'name': 'Normal'}});
                    }
                    new_order.table.color = undefined;
                    console.log("### New Order ###");
                    console.log(new_order);
//                     }
                    
                    //var products = _.map(order.get_orderlines(), function (line) {return line.product; });

                    console.log("### Table Order ###");
                    console.log(order.table);

                    order.get_orderlines().forEach(function (orderline) {
                        console.log("orderline.product.x_studio_temporizador_templ");
                        console.log(orderline.product.x_studio_temporizador_templ);
                        //TODO: Using studio fields is no good for this type of package
                        if (orderline.product.x_studio_temporizador_templ !== false) {
                            timer_product = orderline.product.x_studio_temporizador_templ;
                            console.log("##### time_product");
                            console.log(timer_product);
                            if (timer_product !== false) {
    //                             var product = orderline.product;
                                timer = env.pos.db.get_product_by_id(timer_product[0]);
                                new_order.add_product(timer);
    //                             new_order.set_order_type(timer.order_type_id); // Index 0: Normal / 1: Timer

                                // this.env.pos.order_type_id[1]
                                has_timer_product = true;
    //                             new_order.save_to_db();
                            }
                        }
                    });
                    // Comented on 2021-12-01 after meeting with Samuel, Receipt should be available
//                     // Finalize previous Order to avoid Receipt
//                     console.log("// Finalize previous Order to avoid Receipt");
//                     order.finalize();

                    if (has_timer_product) {
                        new_order.get_orderlines().forEach(function(orderline){
    //                         console.log(orderline);
                            orderline.start_timer();
    //                         orderline.timer_line.stop_start_order_line();
                        });
                        // change the color to Blue, meaning reserverd room
                        new_order.table.color = "blue";
                        new_order.save_to_db();;
                    }
                    this.showScreen('FloorScreen');

                }
            }
        };

    Registries.Component.extend(PaymentScreen, POSValidateOverride);

//     return PaymentScreen;
});