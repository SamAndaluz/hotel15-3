/* Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>) */
/* See LICENSE file for full copyright and licensing details. */
/* License URL : <https://store.webkul.com/license.html/> */
odoo.define('pos_booking_system.screens',function(require){

	var screens = require('point_of_sale.screens');
	var models = require('point_of_sale.models');
    var gui = require('point_of_sale.gui');
    var core = require('web.core');
    var _t = core._t;
    var rpc = require('web.rpc');
    var QWeb = core.qweb;
    var SuperPosModel = models.PosModel.prototype;
    var SuperOrder = models.Order.prototype;



    models.load_models([{
        model: 'booking.order',
        fields: ['name','state','time_slot_id','customer','plan_price','booking_product_id','plan_id','quantity','booking_date','id'],
        domain:[['company_id','=',self.company.id]]],
        order:  _.map(['booking_date'], function (name) { return {name: name}; }),
        loaded: function(self, wk_booking) {
            self.db.booking_by_id = {};
            self.db.booking_by_date = {};
            wk_booking.forEach(function(booking){
                var date = booking.booking_date;
                var date_list = date.split('-');
                var new_formatted_date = date_list[2]+'.'+date_list[1]+'.'+date_list[0];
                booking['new_formatted_date'] = new_formatted_date;
                booking['time_slot_initial'] = parseInt(booking.time_slot_id[1].slice(1,3));
                self.db.booking_by_id[booking.id] = booking;
                if(Object.keys(self.db.booking_by_date).indexOf(booking.new_formatted_date) >= 0){
                    self.db.booking_by_date[booking.new_formatted_date].push(booking.id)
                }
                else{
                   self.db.booking_by_date[booking.new_formatted_date] = [booking.id]; 
                }
                _.each(self.db.booking_by_date,function(booking,index){
                    booking.sort(function(first, second) {
                       if (self.db.booking_by_id[first].time_slot_initial > self.db.booking_by_id[second].time_slot_initial) return 1;
                       if (self.db.booking_by_id[first].time_slot_initial < self.db.booking_by_id[second].time_slot_initial) return -1;
                    })
                })

            });
            self.db.pos_all_bookings = wk_booking;
        },
    }],{
        'after': 'product.product'
    });


    var BookingOrderScreenWidget = screens.ScreenWidget.extend({
        template: 'BookingOrderScreenWidget',

        get_customer: function(customer_id){
            var self = this;
            if(self.gui)
                return self.gui.get_current_screen_param('customer_id');
            else
                return undefined;
        },

        render_list: function(bookings, input_txt) {
            var self = this;
            // var customer_id = this.get_customer();
            var new_booking_data = [];
            if(customer_id != undefined){
                for(var i=0; i<bookings.length; i++){
                    if(booking[i].partner_id[0] == customer_id)
                        new_booking_data = new_booking_data.concat(self.pos.db.booking_by_id[bookings[i]]);
                }
                bookings = new_booking_data;
            }
            if (input_txt != undefined && input_txt != '') {
                var new_booking_data = [];
                var search_text = input_txt.toLowerCase()
                _.each(self.pos.db.booking_by_date,function(bookings,index){
                    _.each(bookings,function(booking){
                        var element = self.pos.db.booking_by_id[booking];
                    if (element.customer == '') {
                        element.customer = [0, '-'];
                    }
                    if (((element.name.toLowerCase()).indexOf(search_text) != -1) || ((element.customer[1].toLowerCase()).indexOf(search_text) != -1) ) {
                        new_booking_data = new_booking_data.concat(element);
                    }
                    });
                })
                bookings = new_booking_data;
        }
            var contents = $el[0].querySelector('.wk-booking-list-contents');
    
            contents.innerHTML = "";
            var wk_bookings = bookings;
            for (var i = 0, len = Math.min(wk_bookings.length, 1000); i < len; i++) {
                var wk_booking = wk_bookings[i];
                if(!wk_booking.is_deleted_via_pos){
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

            $('.wk-booking-list-contents').on('click','#process_start',function(ev){
                ev.stopPropagation();
                var booking_id = $(ev.currentTarget).closest('.wk-booking-line').attr('data-id');
                $('.wk-booking-line[data-id='+booking_id+'] td:nth-child(7)').text('Started');
                self.pos.chrome.widget.order_selector.neworder_click_handler();
                var current_order = self.pos.get_order();
                var booking_order = self.pos.db.booking_by_id[parseInt(booking_id)];
                var product = self.pos.db.product_by_id[booking_order.booking_product_id[0]];
                var client = self.pos.db.partner_by_id[booking_order.customer[0]];
                current_order.add_product(product, {quantity: booking_order.quantity, price: booking_order.plan_price });
                current_order.set_client(client);
                current_order.save_to_db();
                rpc.query({
                    method:'modify_order_status',
                    model:'booking.order',
                    args:[booking_id,'in_progress',current_order.name]
                }).done(function(res){
                    console.log("resssssssssssss",res)
                });
            });
            $('.wk-booking-list-contents').unbind().on('click','#cancel',function(ev){
                
                var booking_id = $(ev.currentTarget).closest('.wk-booking-line').attr('data-id');
                rpc.query({
                    method:'modify_order_status',
                    model:'booking.order',
                    args:[booking_id,'cancel',false]
                }).done(function(res){
                    $('.wk-booking-line[data-id='+booking_id+'] td:nth-child(7)').text('Cancel');
                });
            });
        },
        show: function() {
            var self = this;
            this._super();
            let bookings = [];
            _.each(Object.values(self.pos.db.booking_by_date).reverse(),function(elements,index){
                _.each(elements,function(booking){
                    var element = self.pos.db.booking_by_id[booking];
                bookings.push(element)
                });
            })
            this.render_list(bookings, undefined);
            $('.booking_search').keyup(function() {
                self.render_list(bookings, this.value);
            });
            $('.back').unbind().on('click',function() {
                self.showScreen('products');
            });
            this.details_visible = false;
            this.selected_tr_element = null;
            var contents = $('.booking-details-contents');
            contents.empty();
            var parent = $('.wk_booking_list').parent();
            parent.scrollTop(0);
        },
        close: function() {
            this._super();
            $('.wk-booking-list-contents').undelegate();
        },
    });
    gui.define_screen({name: 'wk_booking',widget:BookingOrderScreenWidget});


    screens.ProductScreenWidget.include({
        show: function(){
            var self = this;
            this._super();
            this.product_categories_widget.reset_category();
            this.numpad.state.reset();
            $('#show_bookings').unbind().on('click',function(){
                var promise_obj = self.pos.update_bookings();
                promise_obj.then(function(res){
                    self.showScreen('wk_booking',{});
                })
            });
        },
    });


    var ShowSlotsButtonWidget = screens.ActionButtonWidget.extend({
        template: 'ShowSlotsButtonWidget',
        button_click: function() {
            var self = this;
            if(self.pos.is_booking_order()){
                var lines = self.pos.get_order().export_as_JSON().lines;
                var new_lines = [];
                _.each(lines,function(line,index){
                    var product_id = line[2].product_id;
                    var product = self.pos.db.product_by_id[product_id];
                    if(!product.is_booking_type){
                        new_lines.push(line);
                    }
                });
                rpc.query({
                    'method':'create_from_ui',
                    'model':'booking.order',
                    'args':[self.pos.get_order().name,new_lines]
                }).done(function(res){
                    $('.order-selector').css('visibility','hidden');
                    self.showScreen('BookingSlotsScreenWidget',{});
                })
                .fail(function(e){
                    self.pos.chrome.gui.show_popup('error',{
                        'title': _t('The booking could not be approved'),
                        'body': _t('Check your internet connection and try again.')
                    });
                });
            }
            else{
                $('.order-selector').css('visibility','hidden');
                self.showScreen('BookingSlotsScreenWidget',{});
            }
           
        },
    });


    screens.define_action_button({
        'name': 'Show Slots',
        'widget': ShowSlotsButtonWidget,
        'condition': function() {
            return true
        },
    });



    var CheckInButtonWidget = screens.ActionButtonWidget.extend({
        template: 'CheckInButtonWidget',
        button_click: function() {
            var self = this;
            if(self.pos.is_booking_order()){
                rpc.query({
                    'method':'mark_checkin',
                    'model':'booking.order',
                    'args':[self.pos.get_order().name]
                }).done(function(res){
                    console.log("ressssssssss",res)
                })
                .fail(function(e){
                    self.pos.chrome.gui.show_popup('error',{
                        'title': _t('The booking could not be approved'),
                        'body': _t('Check your internet connection and try again.')
                    });
                });
            }
            else
                self.gui.show_popup('error',{
                    'title':'Not A Booking Order',
                    'body':'The Current Order Is Not A Booking Order!!'
                });
           
        },
    });


    screens.define_action_button({
        'name': 'Check-In',
        'widget': CheckInButtonWidget,
        'condition': function() {
            return true
        },
    });


});