/* Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>) */
/* See LICENSE file for full copyright and licensing details. */
/* License URL : <https://store.webkul.com/license.html/> */
odoo.define('pos_booking_system.screens', function (require) {

    // var screens = require('point_of_sale.screens');
    var models = require('point_of_sale.models');
    // var gui = require('point_of_sale.gui');
    var core = require('web.core');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const PosComponent = require('point_of_sale.PosComponent');
    const {
        useListener
    } = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');
    var _t = core._t;
    const NumberBuffer = require('point_of_sale.NumberBuffer');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;
    var SuperPosModel = models.PosModel.prototype;
    var SuperOrder = models.Order.prototype;



    var Days = {
        'sun': 0,
        'mon': 1,
        'tue': 2,
        'wed': 3,
        'thu': 4,
        'fri': 5,
        'sat': 6,
    }

    models.load_models([{
        model: 'booking.order',
        fields: ['name', 'state', 'time_slot_id', 'customer', 'end_time', 'reschedule_use', 'company_id', 'booking_source', 'plan_price', 'time_slot_ids', 'booking_product_id', 'plan_id', 'quantity', 'booking_date', 'id'],
        domain: [
            ['state', 'not in', ['done', 'cancel','expired']],
            ['booking_slot_ids', '!=', false]
        ],
        order: _.map(['booking_date'], function (name) {
            return {
                name: name
            };
        }),
        loaded(self, wk_booking) {
            console.log("wk_bookinggggggggggggg")
            var bookings_to_add = [];
            _.each(wk_booking, function (booking) {
                if (booking.company_id && booking.company_id[0] == self.company.id)
                    if (booking.booking_source == 'pos')
                        bookings_to_add.push(booking);
                    else {
                      //  if (booking.state == 'paid' || (booking.booking_source == 'website' && booking.state == 'in_progress'))
                          if (booking.state != 'draft' || booking.booking_source == 'website')
                            bookings_to_add.push(booking)
                    }
            });
            self.db.booking_by_id = {};
            self.db.booking_by_date = {};
            bookings_to_add.forEach(function (booking) {
                var date = booking.booking_date;
                var date_list = date.split('-');
                var new_formatted_date = date_list[2] + '.' + date_list[1] + '.' + date_list[0];
                booking['new_formatted_date'] = new_formatted_date;
                booking['time_slot_initial'] = parseInt(booking.time_slot_id[1].slice(1, 3));
                self.db.booking_by_id[booking.id] = booking;
                if (Object.keys(self.db.booking_by_date).indexOf(booking.new_formatted_date) >= 0) {
                    self.db.booking_by_date[booking.new_formatted_date].push(booking.id)
                } else {
                    self.db.booking_by_date[booking.new_formatted_date] = [booking.id];
                }
                _.each(self.db.booking_by_date, function (booking, index) {
                    booking.sort(function (first, second) {
                        if (self.db.booking_by_id[first].time_slot_initial > self.db.booking_by_id[second].time_slot_initial) return -1;
                        if (self.db.booking_by_id[first].time_slot_initial < self.db.booking_by_id[second].time_slot_initial) return 1;
                    })
                })

            });
            self.db.pos_all_bookings = bookings_to_add;
        }
    }], {
        'after': 'res.company'
    });


    // var BookingOrderScreenWidget = screens.ScreenWidget.extend({
    //     template: 'BookingOrderScreenWidget',
    class BookingOrderScreenWidget extends PosComponent {

        render_list(bookings, input_txt) {
            var self = this;
            // var customer_id = this.get_customer();
            var new_booking_data = [];
            // if(customer_id != undefined){
            //     for(var i=0; i<bookings.length; i++){
            //         if(booking[i].partner_id[0] == customer_id)
            //             new_booking_data = new_booking_data.concat(self.env.pos.db.booking_by_id[bookings[i]]);
            //     }
            //     bookings = new_booking_data;
            // }
            if (input_txt != undefined && input_txt != '') {
                var new_booking_data = [];
                var search_text = input_txt.toLowerCase()
                _.each(self.env.pos.db.booking_by_date, function (bookings, index) {
                    _.each(bookings, function (booking) {
                        var element = self.env.pos.db.booking_by_id[booking];
                        if (element.customer == '') {
                            element.customer = [0, '-'];
                        }
                        if (((element.name.toLowerCase()).indexOf(search_text) != -1) || ((element.plan_id[1].toLowerCase()).indexOf(search_text) != -1) || ((element.time_slot_id[1].toLowerCase()).indexOf(search_text) != -1) || ((element.booking_product_id[1].toLowerCase()).indexOf(search_text) != -1) || ((element.customer[1].toLowerCase()).indexOf(search_text) != -1) || ((element.booking_date.toLowerCase()).indexOf(search_text) != -1)) {
                            new_booking_data = new_booking_data.concat(element);
                        }
                    });
                })
                bookings = new_booking_data;
            }
            var contents = $('div.clientlist-screen.screen.booking')[0].querySelector('.wk-booking-list-contents');

            contents.innerHTML = "";
            var wk_bookings = bookings;
            for (var i = 0, len = Math.min(wk_bookings.length, 1000); i < len; i++) {
                var wk_booking = wk_bookings[i];
                if (wk_booking.end_time) {
                    var intial = wk_booking.end_time.split('.')[0];
                    var end = wk_booking.end_time.split('.')[1];
                    if (intial.length == 1)
                        intial = '0' + intial;
                    if (end.length == 1)
                        end = end + '0';
                    wk_booking.time_slot_id[1] = wk_booking.time_slot_id[1].split('-')[0] + '-' + intial + ':' + end;
                }
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

            $(contents).on('click', '#cancel', function (ev) {
                var booking_id = $(ev.currentTarget).closest('.wk-booking-line').attr('data-id');
                self.env.pos.db.booking_by_id[parseInt(booking_id)].state = 'cancel';
                rpc.query({
                        method: 'modify_order_status',
                        model: 'booking.order',
                        args: [booking_id, 'cancel', false]
                    }).then(function (res) {
                        $('.wk-booking-line[data-id=' + booking_id + '] td:nth-child(9)').text('Cancel');
                        $('.wk-booking-line[data-id=' + booking_id + '] td:nth-child(10)').empty();
                    })
                    .catch(function (e) {
                        self.showPopup('ErrorPopup', {
                            'title': _t('The booking could not be approved'),
                            'body': _t('Check your internet connection and try again.')
                        });
                    });
            });




            $(contents).on('click', '#process_start', function (ev) {
                var booking_id = $(ev.currentTarget).closest('.wk-booking-line').attr('data-id');
                var booking_order = self.env.pos.db.booking_by_id[parseInt(booking_id)];
                var booking_date = booking_order.booking_date;
                var date = new Date(booking_date);
                var booking_time_slot = $(ev.currentTarget).closest('.wk-booking-line').find('td:nth-child(4)').text();
                date.setHours(parseInt(booking_time_slot.trim().slice(0, 2)));
                date.setMinutes(0);
                var new_date = new Date();

                // if(date <= new_date)
                rpc.query({
                    'method': 'get_active_tables',
                    'model': 'booking.order',
                    args: [self.env.pos.company.id]
                }).then(function (res) {
                    console.log("res running bookings", res)
                    var booking_id = $(ev.currentTarget).closest('.wk-booking-line').attr('data-id');
                    var booking_order = self.env.pos.db.booking_by_id[parseInt(booking_id)];
                    console.log("booking order", booking_order)
                    var plan_id = booking_order.plan_id[0];
                    if (res && res.length) {
                        var plan_list = _.filter(res, function (obj) {
                            if (obj.plan_id && obj.plan_id[0] == plan_id) {
                                return obj
                            }
                        })

                        console.log("plan list", plan_list)
                        if (plan_list.length > 0) {
                            self.showPopup('WkPlanOccupied', {
                                'body': 'A Booking is already running for ' + booking_order.plan_id[1] + '.'
                            })
                            return;
                        }
                    }
                    // else{
                    $('.wk-booking-line[data-id=' + booking_id + '] td:nth-child(9)').text('Started');
                    $(ev.currentTarget).hide();
                    $(ev.currentTarget).closest('.wk-booking-line').find('#cancel').hide();
                    self.env.pos.db.booking_by_id[parseInt(booking_id)]['state'] = 'in_progress';
                    var booking_order = self.env.pos.db.booking_by_id[parseInt(booking_id)];
                    var product = self.env.pos.db.product_by_id[booking_order.booking_product_id[0]];
                    var client = self.env.pos.db.partner_by_id[booking_order.customer[0]];
                    var booking_date = booking_order.booking_date;
                    if (booking_date) {
                        var temp = booking_date.split('-');
                        booking_date = temp[2] + '/' + temp[1] + '/' + temp[0];
                    }
                    // self.env.pos.chrome.widget.order_selector.neworder_click_handler();
                    self.env.pos.add_new_order();
                    var current_order = self.env.pos.get_order();
                    current_order.booking_id = parseInt(booking_id);
                    current_order.booking_product_id = product.product_tmpl_id;
                    current_order.booking_date = booking_date;
                    var booking_finish_time = booking_order.time_slot_id[1].split('-')[1].slice(0, 2);
                    var end_time = new Date();
                    end_time.setHours(booking_finish_time);
                    end_time.setMinutes(0);
                    end_time.setSeconds(0);
                    var remaining_time = self.env.pos.get_remaining_time(end_time);
                    current_order.remaining_time = remaining_time;
                    console.log("teimeeer",remaining_time)
                    $('.timer').text(remaining_time);
                    // self.env.pos.chrome.gui.screen_instances.products.show();
                    self.showScreen("ProductScreen");
                    if (booking_order.booking_source == 'website')
                        current_order.isBookingOrderPaid = true;
                    if (current_order.isBookingOrderPaid) {
                        current_order.add_product(product, {
                            quantity: booking_order.quantity,
                            price: 0,
                            is_paid_line: true
                        });
                        current_order.get_selected_orderline().is_paid_line = true;
                        $('.paid_line' + '.' + product.id).show();
                    } else
                        current_order.add_product(product, {
                            quantity: booking_order.quantity,
                            price: booking_order.plan_price
                        });
                    current_order.set_client(client);
                    current_order.save_to_db();
                    rpc.query({
                            method: 'modify_order_status',
                            model: 'booking.order',
                            args: [booking_id, 'in_progress', current_order.name]
                        }).then(function (res) {
                            console.log("resssssssssssss", res)

                        })
                        .catch(function (e) {
                            self.showPopup('ErrorPopup', {
                                'title': _t('The booking could not be approved'),
                                'body': _t('Check your internet connection and try again.')
                            });
                        });

                    // }
                });
                // else {
                //     self.showPopup('ErrorPopup',{
                //         'title': _t('Cannot Process Booking'),
                //         'body': _t('Booking Cannot Be Started Before Time.')
                //     });
                // }
            });


            $(contents).on('click', '#reschedule_booking', function (ev) {
                var booking_id = $(ev.currentTarget).closest('.wk-booking-line').attr('data-id');
                var booking_order = self.env.pos.db.booking_by_id[parseInt(booking_id)];
                if (booking_order && booking_order.reschedule_use >= self.env.pos.db.booking_config.reschedule_limit) {
                    self.showPopup('ErrorPopup', {
                        'title': _t('Out Of Reschedule!!'),
                        'body': _t('The Reschedule Limit Is Over Now.')
                    });
                    return;
                }
                var booking_date = booking_order.booking_date;
                var booking_time_slot = booking_order.time_slot_id[1];
                var date = new Date(booking_date);
                date.setHours(parseInt(booking_time_slot.slice(0, 2)));
                date.setMinutes(0);
                var condition_clear = false;
                if (self.env.pos.db.booking_config && self.env.pos.db.booking_config.time_to_reschedule) {
                    var new_date = new Date();
                    var booking_changed_date = date;
                    console.log("booking_changed_date",booking_changed_date)
                    if (self.env.pos.db.booking_config && self.env.pos.db.booking_config.type_of_reschedule_time == 'days') {
                        booking_changed_date.setDate(booking_changed_date.getDate() - self.env.pos.db.booking_config.time_to_reschedule);
                        console.log("new datae",new_date)
                        if (new_date <= booking_changed_date)
                            condition_clear = true;
                    } else {
                        booking_changed_date.setHours(booking_changed_date.getHours() - self.env.pos.db.booking_config.time_to_reschedule);
                        console.log("new datae2222222",new_date)
                        if (new_date <= booking_changed_date)
                            condition_clear = true;
                    }
                } else {
                    condition_clear = true;
                }
                if (condition_clear) {

                    var product = self.env.pos.db.product_by_id[booking_order.booking_product_id[0]];
                    if (product)
                        rpc.query({
                            'method': 'get_booking_reservation_data',
                            'model': 'pos.order',
                            'args': [product.product_tmpl_id]
                        }).
                    then(function (res) {
                            if (res.booking_status) {
                                var w_c_days = self.get_w_closed_days(res.w_closed_days);
                                res['w_c_days'] = w_c_days;
                                res['product_tmpl_id'] = product.product_tmpl_id;
                                var closing_days = [];
                                _.each(product.closing_days, function (day) {
                                    closing_days.push(self.env.pos.db.booking_close_days[day].date);
                                });
                                res['product_id'] = product.id;
                                if (self.env.pos.db.booking_config && self.env.pos.db.booking_config.booking_range) {
                                    // var date = new Date();
                                    // res['default_date'] = date.getFullYear() +'-'+date.getMonth()+'-'+date.getDate();
                                    // date.setDate(date.getDate() + self.env.pos.db.booking_config.booking_range);
                                    // res['end_date'] = date.getFullYear() +'-'+date.getMonth()+'-'+date.getDate();
                                    var date = new Date();
                                    let month = date.getMonth() + 1
                                    res['default_date'] = date.getFullYear() + '-' + month + '-' + date.getDate();
                                    if (self.env.pos.db.booking_config && self.env.pos.db.booking_config.type_of_booking_range && self.env.pos.db.booking_config.type_of_booking_range == 'days') {
                                        date.setDate(date.getDate() + self.env.pos.db.booking_config.booking_range);
                                    } else if (self.env.pos.db.booking_config && self.env.pos.db.booking_config.type_of_booking_range && self.env.pos.db.booking_config.type_of_booking_range == 'months')
                                        date.setMonth(date.getMonth() + self.env.pos.db.booking_config.booking_range);
                                    else {
                                        date.setYear(date.getFullYear() + self.env.pos.db.booking_config.booking_range);
                                    }
                                    month = date.getMonth() + 1
                                    res['end_date'] = date.getFullYear() + '-' + month + '-' + date.getDate();
                                }
                                if (product.max_bk_qty > 0)
                                    res['max_bk_qty'] = product.max_bk_qty;
                                else
                                    res['max_bk_qty'] = 5;
                                res['max_qty'] = res['max_bk_qty'];
                                res['closing_days'] = closing_days;
                                res['booking_id'] = parseInt(booking_id);
                                self.showPopup('WkRescheduleBookingPopUp', res);
                            } else
                                self.showPopup('ErrorPopup', {
                                    'title': _t('No Slot Configured!!'),
                                    'body': _t('No Slots has been configured for this product.')
                                });
                        })
                        .catch(function (e) {
                            self.showPopup('ErrorPopup', {
                                'title': _t('The booking could not be approved'),
                                'body': _t('Check your internet connection and try again.')
                            });
                        });
                    else
                        self.showPopup('ErrorPopup', {
                            'title': _t('Product Unavailable!!'),
                            'body': _t('The product is unavailable in POS!!')
                        });
                } else {
                    self.showPopup('ErrorPopup', {
                        'title': _t('The booking cannot modify!!'),
                        'body': _t('You Cannot Reschedule booking as the rescheduling period is over now.')
                    });
                }
            });
        }
        get_w_closed_days(w_c_days) {
            var data = JSON.parse(w_c_days).map(day => Days[day])
            return JSON.stringify(data)
        }
        compare_elements(ele1, ele2) {
            if (ele1 > ele2)
                return 1;
            if (ele2 > ele1)
                return -1;
            return 0;
        }
        // compare_elementsby_slot(ele1, ele2){
        //     if(ele1 > ele2)
        //         return 1;
        //     if(ele2 > ele1)
        //         return -1;
        //     return 0;
        // }
        sort_by_slot(bookings) {
            _.each(bookings, function (booking) {
                var date = booking.booking_date;
                var date_list = date.split('-');
                var new_formatted_date = date_list[2] + '.' + date_list[1] + '.' + date_list[0];
                booking['new_formatted_date'] = new_formatted_date;
                booking['time_slot_initial'] = parseInt(booking.time_slot_id[1].slice(1, 3));
            });
            bookings.sort((a, b) => {
                return a.time_slot_initial - b.time_slot_initial;
            })

        }
        mounted() {
            var self = this;
            // this._super();
            super.mounted();
            let bookings = [];
            _.each(Object.values(self.env.pos.db.booking_by_date).reverse(), function (elements, index) {
                _.each(elements, function (booking) {
                    var element = self.env.pos.db.booking_by_id[booking];
                    bookings.push(element)
                });
            })
            this.env.pos.db.current_search_booking = this.env.pos.db.search_date_booking = bookings;
            this.render_list(bookings, undefined);
            $('.booking_search').keyup(function () {
                self.render_list(self.env.pos.db.current_search_booking, this.value);
            });
            $('.orders-screen-content').on('change', '.sort', function () {
                var bookings_to_add = Object.assign([], self.env.pos.db.current_search_booking);
                switch ($('.sort select option:selected').val()) {
                    case 'booking_date':
                        self.render_list(self.env.pos.db.search_date_booking, this.value);
                        break;
                    case 'booking_no':
                        bookings_to_add.sort(function (a, b) {
                            return self.compare_elements(a.name, b.name)
                        });
                        self.env.pos.db.current_search_booking = bookings_to_add;
                        self.render_list(bookings_to_add, this.value);
                        break;
                    case 'booking_slot':
                        self.sort_by_slot(bookings_to_add)
                        self.env.pos.db.current_search_booking = bookings_to_add;
                        self.render_list(bookings_to_add, this.value);
                        break;
                }
            });
            $('.back').unbind().on('click', function () {
                self.showScreen('ProductScreen');
            });
            this.details_visible = false;
            this.selected_tr_element = null;
            var contents = $('.booking-details-contents');
            contents.empty();
            var parent = $('.wk_booking_list').parent();
            parent.scrollTop(0);
        }
        close() {
            // this._super();
            super.close();
            $('.wk-booking-list-contents').undelegate();
        }
    }
    // gui.define_screen({name: 'wk_booking',widget:BookingOrderScreenWidget});
    BookingOrderScreenWidget.template = 'BookingOrderScreenWidget';
    Registries.Component.add(BookingOrderScreenWidget);


    // screens.ProductScreenWidget.include({
    const PosProductScreen = (ProductScreen) =>
        class extends ProductScreen {
            mounted() {
                var self = this;
                // this._super();
                super.mounted();
                // this.product_categories_widget.reset_category();
                var current_order = self.env.pos.get_order();
                if (current_order && current_order.booking_id) {
                    var booking_order = self.env.pos.db.booking_by_id[current_order.booking_id];
                    if (booking_order.booking_source == 'website' && (booking_order.state == 'in_progress' || booking_order.state == 'paid'))
                        $('.booking_paid').show();
                    else
                        $('.booking_paid').hide();
                    if (current_order.booking_id) {
                        $('.timer_hide').show();
                        if (!current_order.timer_interval)
                            current_order.timer_interval = setInterval(function () {
                                self.update_timer(current_order);
                            }, 1000);
                    } else
                        $('.timer_hide').hide();
                    console.log("$('.timer')", $('.timer'))
                    if (current_order.is_booking_finish)
                        $('.timer').text('Booking Finished');
                }
                // NumberBuffer.reset();
                // this.numpad.state.reset();
                if (self.env.pos.update_bookings) {

                    var promise_obj = self.env.pos.update_bookings();
                    promise_obj.then(function () {
                        if (self.env.pos.get_order() && self.env.pos.get_order().booking_id && self.env.pos.db.booking_by_id[self.env.pos.get_order().booking_id].state == 'in_progress') {
                            $('#extend_booking').show();
                        } else {
                            $('#extend_booking').hide();
                        }
                    })
                }
                // }300);
                if (self.env.pos.get_order())
                    self.env.pos.get_order().save_to_db();
                // $('#show_bookings').unbind().on('click',function(){
                //     var promise_obj = self.env.pos.update_bookings();
                //     promise_obj.then(function(res){
                //         self.showScreen('wk_booking',{});
                //     })
                // });
            }
            update_timer(order) {
                var self = this;
                var booking_order = self.env.pos.db.booking_by_id[parseInt(order.booking_id)];
                var booking_finish_time = booking_order.time_slot_id[1].split('-')[1].slice(0, 2);
                var end_time = new Date(booking_order.booking_date);
                end_time.setHours(booking_finish_time);
                end_time.setMinutes(0);
                end_time.setSeconds(0);
                var current_time = new Date();
                if (self.env.pos.get_order().booking_id && self.env.pos.get_order().name == order.name) {
                    if (end_time <= current_time) {
                        $('.timer').text('Booking Finished');
                        order.is_booking_finish = true;
                        clearInterval(order.timer_interval);
                    } else {
                        var remaining_time = self.env.pos.get_remaining_time(end_time);
                        order.remaining_time = remaining_time;
                        $('.timer').text(remaining_time);
                    }
                } else if (!self.env.pos.get_order().booking_id) {
                    $('.timer').text('');
                }
            }
        }

    Registries.Component.extend(ProductScreen, PosProductScreen);

    // BookingOrderScreenWidget

    // var ShowSlotsButtonWidget = screens.ActionButtonWidget.extend({
    class ShowBookingsButtonWidget extends PosComponent {
        //     template: 'ShowSlotsButtonWidget',
        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
        }
        async onClick() {
            var self = this;
            console.log("workinggggggg")
            // self.showScreen('BookingOrderScreenWidget',{})
            var promise_obj = self.env.pos.update_bookings();
            promise_obj.then(function (res) {
                self.showScreen('BookingOrderScreenWidget', {});
            })
        }
    }



    ShowBookingsButtonWidget.template = 'ShowBookingsButtonWidget';
    ProductScreen.addControlButton({
        component: ShowBookingsButtonWidget,
        condition: function () {
            return true;
        },
    });
    Registries.Component.add(ShowBookingsButtonWidget);


    // var ShowSlotsButtonWidget = screens.ActionButtonWidget.extend({
    class ShowSlotsButtonWidget extends PosComponent {
        //     template: 'ShowSlotsButtonWidget',
        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
        }
        async onClick() {
            console.log("working slotssssss")
            var self = this;
            if (self.env.pos.is_booking_order()) {
                var lines = self.env.pos.get_order().export_as_JSON().lines;
                var new_lines = [];
                _.each(lines, function (line, index) {
                    var product_id = line[2].product_id;
                    var product = self.env.pos.db.product_by_id[product_id];
                    if (!product.is_booking_type) {
                        // new_lines.push(line);
                        console.log("lineeeee", line)
                        var temp = [0, 0, {
                            product_id: line[2].product_id,
                            qty: line[2].qty,
                            price_subtotal_incl: line[2].price_subtotal_incl,
                            price_unit: line[2].price_unit
                        }];
                        console.log("temp", temp)
                        new_lines.push(temp)
                    }
                });
                rpc.query({
                        'method': 'create_from_ui',
                        'model': 'booking.order',
                        'args': [self.env.pos.get_order().name, new_lines]
                    }).then(function (res) {
                        $('.order-selector').css('visibility', 'hidden');
                        self.showScreen('BookingSlotsScreenWidget', {});
                    })
                    .catch(function (e) {
                        self.showPopup('ErrorPopup', {
                            'title': _t('The booking could not be approved'),
                            'body': _t('Check your internet connection and try again.')
                        });
                    });
            } else {
                $('.order-selector').css('visibility', 'hidden');
                self.showScreen('BookingSlotsScreenWidget', {});
            }

        }
    }


    // screens.define_action_button({
    //     'name': 'Show Slots',
    //     'widget': ShowSlotsButtonWidget,
    //     'condition'() {
    //         return true
    //     }
    // });


    ShowSlotsButtonWidget.template = 'ShowSlotsButtonWidget';
    // ProductScreen.addControlButton({
    //     component: ShowSlotsButtonWidget,
    //     condition: function () {
    //         return true;
    //     },
    // });
    Registries.Component.add(ShowSlotsButtonWidget);



    // var ExtendBooking = screens.ActionButtonWidget.extend({
    //     template: 'ExtendBooking',
    class ExtendBooking extends PosComponent {

        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
        }
        async onClick(ev) {
            var self = this;
            if (self.env.pos.is_booking_order()) {
                var booking = self.env.pos.db.booking_by_id[self.env.pos.get_order().booking_id];
                var exisitng_slots = booking.time_slot_ids;
                rpc.query({
                        'method': 'get_available_slots_for_extension',
                        'model': 'pos.order',
                        'args': [self.env.pos.get_order().booking_product_id, self.env.pos.get_order().booking_date, exisitng_slots, self.env.pos.get_order().booking_id]
                    }).then(function (res) {
                        self.showPopup('ExtendBookingPopup', {
                            day_slots: res
                        });
                        if (!res) {
                            $('.bookings').hide();
                            $('.confirm-extend').hide();
                        }

                    })
                    .catch(function (e) {
                        self.showPopup('ErrorPopup', {
                            'title': _t('The booking could not be approved'),
                            'body': _t('Check your internet connection and try again.')
                        });
                    });
                // self.env.pos.get_order().is_checkin = true;
                // $('#checkin').addClass('highlight');
                // self.showPopup('order_notify',{
                //     'title':'Check-In Marked!!',
                //     'body':'Check-In marked Successfully!!'
                // })
            } else
                self.showPopup('ErrorPopup', {
                    'title': 'Not A Booking Order',
                    'body': 'The Current Order Is Not A Booking Order!!'
                });

        }
    }


    // screens.define_action_button({
    //     'name': 'Extend Booking',
    //     'widget': ExtendBooking,
    //     'condition'() {
    //         return true
    //     }
    // });


    ExtendBooking.template = 'ExtendBooking';
    ProductScreen.addControlButton({
        component: ExtendBooking,
        condition: function () {
            return true;
        },
    });
    Registries.Component.add(ExtendBooking);



    // screens.PaymentScreenWidget.include({
    const PosPaymentScreen = (PaymentScreen) =>
        class extends PaymentScreen {
            mounted() {
                var self = this;
                var booking_order = self.env.pos.db.booking_by_id[this.env.pos.get_order().booking_id]
                if (this.env.pos.get_order().booking_id && booking_order.booking_source == 'website')
                    $('.then_booking').show();
                else
                    $('.then_booking').hide();
                // this._super();
                super.mounted();
                $('.then_booking').click(function () {
                    // self.showPopup('confirm',{
                    //     'title':'Done Booking!!',
                    //     'body':'Are you sure you want to done this booking?',
                    //     confirm:function(){
                    //         rpc.query({
                    //             method:'modify_order_status',
                    //             model:'booking.order',
                    //             args:[self.env.pos.get_order().booking_id,'done',self.env.pos.get_order().name]
                    //         }).then(function(res){
                    //             self.env.pos.get_order().destroy();
                    //         })
                    //         .catch(function(e){
                    //             self.showPopup('ErrorPopup',{
                    //                 'title': _t('The booking could not be approved'),
                    //                 'body': _t('Check your internet connection and try again.')
                    //             });
                    //         });


                    //     }
                    // });
                    // const { confirmed } = await self.showPopup('ConfirmPopup', {
                    //     title: self.env._t('Done Booking!!'),
                    //     body: self.env._t(
                    //         'Are you sure you want to done this booking?.'
                    //     ),
                    // });
                    // if (confirmed) {
                    //     rpc.query({
                    //         method:'modify_order_status',
                    //         model:'booking.order',
                    //         args:[self.env.pos.get_order().booking_id,'done',self.env.pos.get_order().name]
                    //     }).then(function(res){
                    //         self.env.pos.get_order().destroy();
                    //     })
                    //     .catch(function(e){
                    //         self.showPopup('ErrorPopup',{
                    //             'title': _t('The booking could not be approved'),
                    //             'body': _t('Check your internet connection and try again.')
                    //         });
                    //     });
                    // }
                    self.modify_order_status();
                });
            }
            async modify_order_status() {
                var self = this;
                const {
                    confirmed
                } = await self.showPopup('ConfirmPopup', {
                    title: self.env._t('Done Booking!!'),
                    body: self.env._t(
                        'Are you sure you want to done this booking?.'
                    ),
                });
                if (confirmed) {
                    rpc.query({
                            method: 'modify_order_status',
                            model: 'booking.order',
                            args: [self.env.pos.get_order().booking_id, 'done', self.env.pos.get_order().name]
                        }).then(function (res) {
                            self.env.pos.get_order().destroy();
                        })
                        .catch(function (e) {
                            self.showPopup('ErrorPopup', {
                                'title': _t('The booking could not be approved'),
                                'body': _t('Check your internet connection and try again.')
                            });
                        });
                }

            }


            async validateOrder(isForceValidate) {
                // validate_order(force_validation) {
                var self = this;
                // self._super(force_validation);
                super.validateOrder(isForceValidate);
                if (self.env.pos.is_booking_order()) {
                    var lines = self.env.pos.get_order().export_as_JSON().lines;
                    var new_lines = [];
                    _.each(lines, function (line, index) {
                        var product_id = line[2].product_id;
                        var product = self.env.pos.db.product_by_id[product_id];
                        if (!product.is_booking_type) {
                            // new_lines.push(line);
                            console.log("lineeeee", line)
                            var temp = [0, 0, {
                                product_id: line[2].product_id,
                                qty: line[2].qty,
                                price_subtotal_incl: line[2].price_subtotal_incl,
                                price_unit: line[2].price_unit
                            }];
                            console.log("temp", temp)
                            new_lines.push(temp)
                        }
                    });
                    rpc.query({
                            'method': 'create_from_ui',
                            'model': 'booking.order',
                            'args': [self.env.pos.get_order().name, new_lines]
                        }).then(function (res) {
                            $('.order-selector').css('visibility', 'hidden');
                        })
                        .catch(function (e) {
                            self.showPopup('ErrorPopup', {
                                'title': _t('The booking could not be approved'),
                                'body': _t('Check your internet connection and try again.')
                            });
                        });
                }
            }

        }
    Registries.Component.extend(PaymentScreen, PosPaymentScreen);


});
