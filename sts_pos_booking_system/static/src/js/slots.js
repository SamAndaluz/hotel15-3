odoo.define('sts_pos_booking_system.SlotsScreen', function (require) {
    "use strict";

    // var PosBaseWidget = require('point_of_sale.BaseWidget');
    // var chrome = require('point_of_sale.chrome');
    // var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    // var screens = require('point_of_sale.screens');
    var core = require('web.core');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    var rpc = require('web.rpc');

    var QWeb = core.qweb;
    var _t = core._t;



    // var BookingSlotsScreenWidget = screens.ScreenWidget.extend({
    //     template: 'BookingSlotsScreenWidget',
    class BookingSlotsScreenWidget extends PosComponent {

        render_list (bookings, input_txt) {
            var self = this;
            var new_booking_data = [];
            if (input_txt != undefined && input_txt != '') {
                var new_booking_data = [];
                var search_text = input_txt.toLowerCase()
                _.each(self.env.pos.db.booking_by_date, function (bookings, index) {
                    _.each(bookings, function (booking) {
                        var element = self.env.pos.db.booking_by_id[booking];
                        if (element.customer == '') {
                            element.customer = [0, '-'];
                        }
                        if (((element.name.toLowerCase()).indexOf(search_text) != -1) || ((element.customer[1].toLowerCase()).indexOf(search_text) != -1)) {
                            new_booking_data = new_booking_data.concat(element);
                        }
                    });
                })
                bookings = new_booking_data;
            }
            var contents = $('div.clientlist-screen.screen.slots')[0].querySelector('.wk-booking-list-contents');
            contents.innerHTML = "";
            var wk_bookings = bookings;
            for (var i = 0, len = Math.min(wk_bookings.length, 1000); i < len; i++) {
                var wk_booking = wk_bookings[i];
                if (!wk_booking.is_deleted_via_pos) {
                    var bookingline_html = QWeb.render('WkBookingOrderLine', {
                        widget: this,
                        booking: wk_booking
                    });
                    var bookingline = document.createElement('tbody');
                    bookingline.innerHTML = bookingline_html;
                    bookingline = bookingline.childNodes[1];
                    contents.appendChild(bookingline);
                }
            }
        }
        mounted () {
            var self = this;
            // this._super();
            super.mounted();
            $('.back').unbind().on('click', function () {
                $('.order-selector').css('visibility', 'visible');
                self.showScreen('ProductScreen');
            });
            rpc.query({
                'method': 'get_active_tables',
                'model': 'booking.order',
                args:[self.env.pos.company.id]
            }).then(function (res) {
                console.log("Resssssssssss",res)
                if (res && res.length) {
                    var new_html = QWeb.render('InnerSlotData', {
                        booking_data: res
                    });
                    $('.slots-details-contents').html(new_html);
                    $('.slots-details-contents').unbind().on('click', '.slot-use', function (e) {
                        var order_name = $(e.currentTarget).attr('order-name');
                        // var el = $('.order-button.select-order[data-uid=' + order_name + ']');
                        var booking_id = $(e.currentTarget).attr('data-id');
                        var booking_date = $(e.currentTarget).attr('booking-date');
                        if (booking_date) {
                            var temp = booking_date.split('-');
                            booking_date = temp[2] + '/' + temp[1] + '/' + temp[0];
                        }
                        console.log("order_name",order_name)
                        var order_list = self.env.pos.get_order_list();
                        var order = _.filter(order_list,(order)=>{
                            console.log("order.name",order.name,order_name)
                            return order.name == order_name
                        });
                        if(order && order.length){
                            console.log("orderrrrrrrr",order)
                            self.env.pos.set_order(order[0]);
                            $('.order-selector').css('visibility', 'visible');
                            self.env.pos.get_order().booking_id = parseInt(booking_id);
                            self.showScreen('ProductScreen');
                            self.env.pos.get_order().booking_date = booking_date;
                            var booking_order = self.env.pos.db.booking_by_id[parseInt(booking_id)];
                            var product = self.env.pos.db.product_by_id[booking_order.booking_product_id[0]];
                            self.env.pos.get_order().booking_product_id = product.product_tmpl_id;
                        } else {
                            // self.env.pos.chrome.widget.order_selector.neworder_click_handler();
                            self.env.pos.add_new_order()
                            $('.order-selector').css('visibility', 'visible');
                            var current_order = self.env.pos.get_order();
                            current_order.booking_id = parseInt(booking_id);
                            current_order.booking_date = booking_date;
                            var booking_order = self.env.pos.db.booking_by_id[parseInt(booking_id)];
                            var product = self.env.pos.db.product_by_id[booking_order.booking_product_id[0]];
                            if(product){
                              current_order.booking_product_id = product.product_tmpl_id;
                              var client = self.env.pos.db.partner_by_id[booking_order.customer[0]];
                              if(booking_order.booking_source == 'website')
                              current_order.isBookingOrderPaid = true;
                            }
                            else {
                              self.showPopup('ErrorPopup',{
                                'title':'Product Not Available!!',
                                'body':'The Booking Product is not available in the POS!!'
                              })
                            }
                            if(current_order.isBookingOrderPaid){
                              current_order.add_product(product, {
                                quantity: booking_order.quantity,
                                price: 0
                              });
                              current_order.get_selected_orderline().is_paid_line = true;
                              $('.paid_line'+ '.' + product.id).removeClass('paid_line');
                            }
                            else
                                current_order.add_product(product, {
                                    quantity: booking_order.quantity,
                                    price: booking_order.plan_price
                                });

                            rpc.query({
                                    method: 'get_additional_lines',
                                    model: 'booking.order',
                                    args: [parseInt(booking_id), current_order.name]
                                }).then(function (res) {
                                    _.each(res.lines, function (line) {
                                        let product = self.env.pos.db.product_by_id[line.product_id];
                                        if(!product.is_booking_type)
                                            current_order.add_product(product, {
                                                quantity: line.qty,
                                                price: line.price_unit
                                            })
                                    })
                            current_order.booking_id = parseInt(booking_id);
                            // if (self.pos && self.env.pos.gui && self.env.pos.gui.screen_instances && self.env.pos.gui.screen_instances.products)
                            //             self.env.pos.gui.screen_instances.products.show()
                            self.showScreen('ProductScreen');
                                    current_order.set_client(client);
                                    current_order.save_to_db();
                                })
                                .catch(function (e) {
                                    self.showPopup('ErrorPopup', {
                                        'title': _t('The booking could not be approved'),
                                        'body': _t('Check your internet connection and try again.')
                                    });
                                });

                        }
                    });
                } else {
                    var ele = `<p style="
                    font-size: 33px;
                    margin-top: 24%;font-weight:bold;">There Are No Active Slots!!</p>`;
                    $('.slots-details-contents').html(ele);
                }

            });
        }
    }
    // gui.define_screen({
    //     name: 'BookingSlotsScreenWidget',
    //     widget: BookingSlotsScreenWidget
    // });

    BookingSlotsScreenWidget.template = 'BookingSlotsScreenWidget';
	Registries.Component.add(BookingSlotsScreenWidget);


});
