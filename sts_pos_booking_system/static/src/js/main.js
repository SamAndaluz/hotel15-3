    /* Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>) */
    /* See LICENSE file for full copyright and licensing details. */
    /* License URL : <https://store.webkul.com/license.html/> */
    odoo.define('sts_pos_booking_system.pos_booking_managment', function (require) {
        "use strict";
        // var screens = require('point_of_sale.screens');
        // var gui = require('point_of_sale.gui');
        var models = require('point_of_sale.models');
        var core = require('web.core');
        var QWeb = core.qweb;
        const {Gui} = require('point_of_sale.Gui');
        const PosComponent = require('point_of_sale.PosComponent');
        const { useListener } = require('web.custom_hooks');
        var rpc = require('web.rpc');
        const ProductScreen = require('point_of_sale.ProductScreen');
        const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
    var _t = core._t;
        // var PopUpWidget = require('point_of_sale.popups');
        var SuperOrder = models.Order.prototype;
        var SuperPosModel = models.PosModel.prototype;


        models.load_fields('product.product', ['max_bk_qty', 'closing_days', 'is_booking_type','range_price', 'min_booking_time', 'flexible_time_extension']);
        // models.load_fields('res.partner', ['membership_state']);


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
            model: 'booking.config',
            label: 'Booking Config',
            domain: [
                ['active_record', '=', true]
            ],
            loaded: function (self, result) {
                self.db.booking_config = null;
                _.each(result, function (config) {
                    if (config.company_id && config.company_id[0] == self.company.id) {
                        self.db.booking_config = config;
                    }
                })
            }
        }, {
            model: 'booking.closing.day',
            label: 'Booking Closing Day',
            fields: ['name','date'],
            loaded: function (self, result) {
                self.db.booking_close_days = {};
                if (result.length)
                    _.each(result, function (res) {
                        self.db.booking_close_days[res.id] = res;
                    })
            }
        }], {
            'after': 'pos.config'
        });



    class WkOrderCreateNotifyPopupWidget extends AbstractAwaitablePopup {
        mounted () {
            var self = this;
            // self._super(props);
            super.mounted();
            // this.props = props;
            $('.order_status').show();
            $('#order_sent_status').hide();
            $('.order_status').removeClass('order_done');
            $('.show_tick').hide();
            setTimeout(function () {
                $('.order_status').addClass('order_done');
                $('.show_tick').show();
                $('#order_sent_status').show();
                $('.order_status').css({
                    'border-color': '#5cb85c'
                })
            }, 500)
            setTimeout(function () {
                self.cancel();
            }, 1500)
        }
    }
    WkOrderCreateNotifyPopupWidget.template = 'OrderCreateNotifyPopupWidget';
    WkOrderCreateNotifyPopupWidget.defaultProps = {
        title: 'Confirm ?',
        body: '',
    };

    Registries.Component.add(WkOrderCreateNotifyPopupWidget);

    //     var OrderCreateNotifyPopupWidget = PopUpWidget.extend({
    //         template: 'OrderCreateNotifyPopupWidget',
    //         events: {
    //             'click .button.cancel': 'click_cancel'
    //         },
    //         show: function (props) {
    //             var self = this;
    //             self._super(props);
    //             this.props = props;
    //             $('.order_status').show();
    //             $('#order_sent_status').hide();
    //             $('.order_status').removeClass('order_done');
    //             $('.show_tick').hide();
    //             setTimeout(function () {
    //                 $('.order_status').addClass('order_done');
    //                 $('.show_tick').show();
    //                 $('#order_sent_status').show();
    //                 $('.order_status').css({
    //                     'border-color': '#5cb85c'
    //                 })
    //             }, 500)
    //             setTimeout(function () {
    //                 self.click_cancel();
    //             }, 1500)
    //         },
    //     });
    //     gui.define_popup({
    //         name: 'WkOrderCreateNotifyPopupWidget',
    //         widget: OrderCreateNotifyPopupWidget
    //     });



    class ExtendBookingPopup extends AbstractAwaitablePopup {

        // var ExtendBookingPopup = PopUpWidget.extend({
        //     template: 'ExtendBookingPopup',
        //     events: {
        //         'click .button.cancel': 'click_cancel',
        //         'click .confirm-extend': 'click_confirm_extend'
        //     },
            mounted() {
                var self = this;
                // self._super(props);
                super.mounted()
                // this.props = props;
                $('.popup').on('click', '.timeslot', function (e) {
                    if ($(e.currentTarget).hasClass('active_slot'))
                        $(e.currentTarget).removeClass('active_slot');
                    else
                        $(e.currentTarget).addClass('active_slot');

                })
            }
            click_confirm_extend () {
                var self = this;
                if ($('.timeslot.active_slot').length == 0) {
                    $('.wk-error-text').text('Please Select a timeslot!!')
                } else {
                    var active_timeslots = [];
                    var el_slots = [];
                    _.each($('.timeslot.active_slot'), function (element) {
                        el_slots.push(element);
                        active_timeslots.push(parseInt($(element).attr('data-time_slot_id')))
                    });
                    var booking = self.env.pos.db.booking_by_id[self.env.pos.get_order().booking_id];
                    rpc.query({
                        method: 'extend_booking_order',
                        model: 'booking.order',
                        args: [active_timeslots, self.env.pos.get_order().booking_id, booking.plan_id[0], self.env.pos.get_order().booking_date]
                    }).then(function (res) {
                        var time_slots = self.env.pos.db.booking_by_id[self.env.pos.get_order().booking_id].time_slot_ids;
                        time_slots = time_slots.concat(active_timeslots);
                        self.env.pos.db.booking_by_id[self.env.pos.get_order().booking_id].time_slot_ids = time_slots;
                        var unique = new Set(el_slots);
                        var elements= Array.from(unique);
                        self.env.pos.db.booking_by_id[self.env.pos.get_order().booking_id].end_time = $(elements[elements.length-1]).text().trim().split("-")[1].replace(":",'.');
                        self.showPopup('WkOrderCreateNotifyPopupWidget',{
                            'title':'Booking Extended!!',
                            'body':'The booking '+self.env.pos.db.booking_by_id[self.env.pos.get_order().booking_id].name+' has been extended Successfully!!'
                        })
                    });
                }
            }
        // });
        // gui.define_popup({
        //     name: 'extend_booking_popup',
        //     widget: ExtendBookingPopup
        // });
    }

        ExtendBookingPopup.template = 'ExtendBookingPopup';
        ExtendBookingPopup.defaultProps = {
            title: 'Confirm ?',
            body: '',
        };

        Registries.Component.add(ExtendBookingPopup);


        // var RescheduleBookingPopUp = PopUpWidget.extend({
        //     template: 'RescheduleBookingPopUp',
        //     events: {
        //         'click .button.cancel': 'click_cancel',
        //         'click .proceed': 'click_proceed'
        //     },
        //     click_proceed: function () {
        //         var self = this;
        //     },
        //     show: function (props) {
        //         var self = this;
        //         self.props = props;
        //         self.selected_timeslots = {};
        //         this._super(props);
        //         $('.popup').on('change', '.booking_date', function (e) {
        //             var input_date = $('.booking_date').val();
        //             self.all_slots = [];
        //             if (input_date) {
        //                 var temp = input_date.split('/');
        //                 input_date = temp[1] + '/' + temp[0] + '/' + temp[2];
        //                 self.booking_date = input_date;
        //             }
        //             rpc.query({
        //                     'method': 'update_time_slots',
        //                     'model': 'pos.order',
        //                     'args': [self.props.product_tmpl_id, input_date, self.props.booking_id]
        //                 })
        //                 .then(function (result) {
        //                     if (result.day_slots.length == 0) {
        //                         $('.body').html('<div>No slots are available for the day.</div>');
        //                         $('.button.book').hide();
        //                         return false;
        //                     }
        //                     var core = require('web.core');
        //                     var qweb = core.qweb;
        //                     var max_bk_qty = [];
        //                     for (var i = 1; i <= self.props.max_bk_qty; i++) {
        //                         max_bk_qty.push(i);
        //                     }
        //                     result['max_bk_qty'] = max_bk_qty;
        //                     result['max_qty'] = self.props.max_qty;
        //                     self.slot_plans = {};
        //                     _.each(result.day_slots, function (slot) {
        //                         self.slot_plans[slot.slot.id] = slot.plans;
        //                     })
        //                     self.all_slots = result.day_slots;
        //                     var html = qweb.render('RescheduleBookingTimeSlot', result);
        //                     $('.datepicker_div').hide();
        //                     $('.book_booking_form').append(html);
        //                     $('.popup').on('click', '.timeslot', function (e) {
        //                         if ($(e.currentTarget).hasClass('active_slot'))
        //                             $(e.currentTarget).removeClass('active_slot');
        //                         else
        //                             $(e.currentTarget).addClass('active_slot');
        //
        //                     });
        //                 })
        //                 .catch(function (e) {
        //                     self.showPopup('Error', {
        //                         'title': _t('The booking could not be approved'),
        //                         'body': _t('Check your internet connection and try again.')
        //                     });
        //                 });
        //
        //         });
        //     },
        //     click_proceed: function () {
        //         var self = this;
        //         _.each(slots_list, function (slot, index) {
        //             var slot_difference = slot.end_time - slot.start_time;
        //             if (slots_list[index - 1] && slots_list[index - 1].end_time != slot.start_time) {
        //                 time_gap = true;
        //                 if (slots_list[index - 1].plan != slot.plan)
        //                     is_same_booking_plan = false;
        //             }
        //             if ((slots_list[index - 1] && slots_list[index - 1].end_time == slot.start_time) || index == 0)
        //                 total_time += slot_difference;
        //             _.each(all_slots, function (in_slot) {
        //                 if (in_slot.slot.start_time == slot.end_time)
        //                     next_slot_available = true;
        //             });
        //         });
        //         var slots = []
        //         if ($('.timeslot.active_slot').length == 0) {
        //             $('.wk-error-text').text('Please Select a timeslot!!')
        //         } else {
        //           _.each($('.timeslot.active_slot'),function(e){
        //               slots.push({'start_time':$(e).data('start_time'),'endd_time':$(e).data('end_time')})
        //           })
        //           console.log("slotssss",slots)
        //             var active_timeslots = [];
        //             _.each($('.timeslot.active_slot'), function (element) {
        //                 active_timeslots.push(parseInt($(element).attr('data-time_slot_id')))
        //             });
        //             var booking = self.env.pos.db.booking_by_id[self.props.booking_id];
        //             rpc.query({
        //                 method: 'reschedule_booking_order',
        //                 model: 'booking.order',
        //                 args: [active_timeslots, self.props.booking_id, booking.plan_id[0], self.booking_date]
        //             }).then(function (res) {
        //                 var time_slots = booking.time_slot_ids;
        //                 time_slots = time_slots.concat(active_timeslots);
        //                 self.env.pos.db.booking_by_id[self.props.booking_id].time_slot_ids = time_slots;
        //                 self.env.pos.db.booking_by_id[self.props.booking_id].reschedule_use += 1;
        //                 self.click_cancel();
        //             });
        //         }
        //     }
        // });
        //
    class WkRescheduleBookingPopUp extends AbstractAwaitablePopup {
            click_proceed () {
                var self = this;
            }
            mounted() {
                var self = this;
                // self.props = props;
                self.selected_timeslots = {};
                // this._super(props);
                super.mounted();
                $('.popup').on('change', '.booking_date', function (e) {
                    var input_date = $('.booking_date').val();
                    self.all_slots = [];
                    if (input_date) {
                        var temp = input_date.split('/');
                        input_date = temp[1] + '/' + temp[0] + '/' + temp[2];
                        self.booking_date = input_date;
                    }
                    rpc.query({
                            'method': 'update_time_slots',
                            'model': 'pos.order',
                            'args': [self.props.product_tmpl_id, input_date, self.props.booking_id]
                        })
                        .then(function (result) {
                            if (result.day_slots.length == 0) {
                                $('.body').html('<div>No slots are available for the day.</div>');
                                $('.button.book').hide();
                                return false;
                            }
                            var core = require('web.core');
                            var qweb = core.qweb;
                            var max_bk_qty = [];
                            for (var i = 1; i <= self.props.max_bk_qty; i++) {
                                max_bk_qty.push(i);
                            }
                            result['max_bk_qty'] = max_bk_qty;
                            result['max_qty'] = self.props.max_qty;
                            self.slot_plans = {};
                            _.each(result.day_slots, function (slot) {
                                self.slot_plans[slot.slot.id] = slot.plans;
                            })
                            self.all_slots = result.day_slots;
                            var html = qweb.render('RescheduleBookingTimeSlot', result);
                            $('.datepicker_div').hide();
                            $('.book_booking_form').append(html);
                            $('.popup').on('click', '.timeslot', function (e) {
                                $('.wk-error-text').text('')
                                if ($(e.currentTarget).hasClass('wk_active_slot'))
                                    $(e.currentTarget).removeClass('wk_active_slot');
                                else
                                    $(e.currentTarget).addClass('wk_active_slot');

                            });
                        })
                        .catch(function (e) {
                            self.showPopup('ErrorPopup', {
                                'title': _t('The booking could not be approved'),
                                'body': _t('Check your internet connection and try again.')
                            });
                        });

                });
            }
            click_proceed () {
                var self = this;
                if ($('.timeslot.wk_active_slot').length == 0) {
                    $('.wk-error-text').text('Please Select a timeslot!!')
                } else {
                    var new_slots = []
                    var booking = self.env.pos.db.booking_by_id[self.props.booking_id];
                    var time_difference_seleted = 0;
                    var el_slots = [];
                    _.each($('.timeslot.wk_active_slot'),function(e){
                        el_slots.push(e);
                    })
                    var unique = new Set(el_slots);
                      _.each(Array.from(unique),function(e){
                        new_slots.push({'time_slot_id':$(e).data('time_slot_id'),'start_time':$(e).data('start_time'),'end_time':$(e).data('end_time')})
                          time_difference_seleted += ($(e).data('end_time') - parseInt($(e).data('start_time')))
                      })
                      var time_gap = false;
                      var slots = new_slots.sort(function(a,b){
                          return a.start_time - b.start_time;
                      })
                      _.each(slots, function (slot, index) {
                          if (slots[index - 1] && slots[index - 1].end_time != slot.start_time) {
                              time_gap = true;
                          }
                    });
                      if(time_gap) {
                            $('.wk-error-text').text('Please Choose The Continous Slots To Proceed!!');
                            return;
                    }
                      var time_schedule_booking = booking.time_slot_id[1].split('-');
                      var booking_time_difference = (parseInt(time_schedule_booking[1].replace(":",'.')) - parseInt(time_schedule_booking[0].replace(":",'.')))
                      if(time_difference_seleted != booking_time_difference){
                        $('.wk-error-text').text('You can only select time slot of duration '+booking_time_difference+'.');
                        return;
                      }

                    var active_timeslots = [];
                    _.each(Array.from(unique), function (element) {
                        active_timeslots.push(parseInt($(element).attr('data-time_slot_id')))
                    });
                    console.log("slots[0].time_slot_id",slots[0].time_slot_id)
                    rpc.query({
                        method: 'reschedule_booking_order',
                        model: 'booking.order',
                        args: [active_timeslots, self.props.booking_id, booking.plan_id[0], self.booking_date,slots[0].time_slot_id]
                    }).then(function (res) {
                        var time_slots = booking.time_slot_ids;
                        time_slots = time_slots.concat(active_timeslots);
                        var elements= Array.from(unique);
                        var time_slot = $(elements[0]).text().trim();
                        console.log("trim slot",time_slot,$(elements[elements.length - 1]).text());
                        var date_list = self.booking_date.split('/');
                        var new_formatted_date = date_list[2] + '-' + date_list[1] + '-' + date_list[0];
                        self.env.pos.db.booking_by_id[self.props.booking_id].booking_date = new_formatted_date;
                        self.env.pos.db.booking_by_id[self.props.booking_id].time_slot_ids = time_slots;
                        self.env.pos.db.booking_by_id[self.props.booking_id].time_slot_id = [2,time_slot];
                        self.env.pos.db.booking_by_id[self.props.booking_id].end_time = $(elements[elements.length-1]).text().trim().split("-")[1].replace(":",'.');
                        self.env.pos.db.booking_by_id[self.props.booking_id].reschedule_use += 1;
                        // self.env.pos.gui.screen_instances.wk_booking.render_list(self.env.pos.db.pos_all_bookings);
                        self.showScreen('BookingOrderScreenWidget');
                        self.showPopup('WkOrderCreateNotifyPopupWidget', {
                            'title': 'Booking Rescheduled!!',
                            'body': 'Your Booking Has Been Rescheduled!!'
                        })
                    });
                }
            }
        }

        WkRescheduleBookingPopUp.template = 'RescheduleBookingPopUp';
        WkRescheduleBookingPopUp.defaultProps = {
            title: 'Confirm ?',
            body: '',
        };

        Registries.Component.add(WkRescheduleBookingPopUp);



        // var WkAlertPopUp = PopUpWidget.extend({
        //     template: 'WkAlertPopUp',
        // });

        // gui.define_popup({
        //     name: 'wk_alert_popup',
        //     widget: WkAlertPopUp
        // });


        class WkAlertPopUp extends AbstractAwaitablePopup {
            getPayload() {
                return null;
            }
        }
        WkAlertPopUp.template = 'WkAlertPopUp';
        WkAlertPopUp.defaultProps = {
            title: 'Confirm ?',
            body: '',
        };

        Registries.Component.add(WkAlertPopUp);



        // var PlanOccupied = PopUpWidget.extend({
        //     template: 'PlanOccupied',
        // });

        // gui.define_popup({
        //     name: 'plan_occupied',
        //     widget: PlanOccupied
        // });



        class WkPlanOccupied extends AbstractAwaitablePopup {
            getPayload() {
                return null;
            }
        }
        WkPlanOccupied.template = 'PlanOccupied';
        WkPlanOccupied.defaultProps = {
            title: 'Confirm ?',
            body: '',
        };

        Registries.Component.add(WkPlanOccupied);



    class WkBookReservationPopUp extends AbstractAwaitablePopup {
        // var BookReservationPopUp = PopUpWidget.extend({
        //     template: 'BookReservationPopUp',
        //     events: _.extend({}, PopUpWidget.prototype.events, {
        //         'click .proceed-date': 'proceed_date',
        //         'click .book': 'WkBookReservationPopUp,
        //         'click input.booking_dates': 'click_input_date',
        //         'click .filter-now': 'filter_now'
        //     }),
            mounted() {
                var self = this;
                // self.props = props;
                self.selected_timeslots = {};
                self.is_changed = false;
                // this._super(props);
                super.mounted();
                self.renderBookingForm();
                $('.popup').on('click', '.filter-now', function (e) {
                    self.filter_now(e);
                })
            }
            proceed_date(ev){
              var self = this;
              $('.booking_dates').trigger('change');
            }
            compare_values (a, b) {
                var self = this;
                if (a < b)
                    return -1;
                if (a > b)
                    return 1;
                return 0;
            }
            book_reservation () {
                var self = this;
                // $('.popup').on('click','.book', function (e) {
                if (Object.keys(self.selected_timeslots).length == 0) {
                    $('.wk-error-text').text('Please Select A Slot!!')
                    return false
                }
                var time_slots = Object.assign({}, self.selected_timeslots);
                _.each(time_slots, function (slot, index) {
                    if (time_slots[index] && time_slots[index]['plans'])
                        _.each(time_slots[index]['plans'], function (plan, ind) {
                            if (!plan.plan_id)
                                delete time_slots[index]['plans'][ind];
                        })
                    if (Object.keys(time_slots[index]['plans']).length == 0)
                        delete time_slots[index];
                });
                if ((Object.keys(self.selected_timeslots).length == 0 && !self.selected_timeslots[0]) || !Object.keys(time_slots).length) {
                    $('.wk-error-text').text('Please Select A Plan!!')
                    return false
                }
                var product_id = self.props.product_id;
                var product = self.env.pos.db.product_by_id[product_id];
                var total_time = 0;
                var time_gap = false;
                var is_same_booking_plan = true;
                var next_slot_available = false;
                var slots_list = Object.values(self.selected_timeslots).sort(function (a, b) {
                    return self.compare_values(a.start_time, b.start_time);
                });
                var all_slots = Object.values(self.all_slots).sort(function (a, b) {
                    return self.compare_values(a.slot.start_time, b.slot.start_time);
                });
                _.each(slots_list, function (slot, index) {
                    var slot_difference = slot.end_time - slot.start_time;
                    if (slots_list[index - 1] && slots_list[index - 1].end_time != slot.start_time) {
                        time_gap = true;
                        if (slots_list[index - 1].plan != slot.plan)
                            is_same_booking_plan = false;
                    }
                    if ((slots_list[index - 1] && slots_list[index - 1].end_time == slot.start_time) || index == 0)
                        total_time += slot_difference;
                    _.each(all_slots, function (in_slot) {
                        if (in_slot.slot.start_time == slot.end_time)
                            next_slot_available = true;
                    });
                });
                if (time_gap && (is_same_booking_plan || (product.min_booking_time && total_time >= product.min_booking_time && total_time % product.min_booking_time != 0 && !product.flexible_time_extension))) {
                    $('.wk-error-text').text('Please Choose The Continous Slots To Proceed!!');
                    return;
                }
                console.log("total_time",total_time)
                if (product.min_booking_time && total_time < product.min_booking_time && next_slot_available) {
                    $('.wk-error-text').text('Please Add time slots of atleast ' + product.min_booking_time + ' Hours!!');
                    return;
                }
                if (product.min_booking_time && total_time >= product.min_booking_time && total_time % product.min_booking_time != 0 && !is_same_booking_plan) {
                    $('.wk-error-text').text('Please Add the continous slots of same plan !!');
                    return;
                }
                if (product.min_booking_time && total_time >= product.min_booking_time && total_time % product.min_booking_time != 0 && !product.flexible_time_extension) {
                    $('.wk-error-text').text('Please Add time slots in multiple of ' + product.min_booking_time + ' !!');
                    return;
                }
                var input_date = $('.booking_dates').val();
                var partner_id = self.env.pos.get_order().get_client() && self.env.pos.get_order().get_client().id;
                _.each(self.selected_timeslots, function (slot, index) {
                    if (self.selected_timeslots[index] && self.selected_timeslots[index]['plans'])
                        _.each(self.selected_timeslots[index]['plans'], function (plan, ind) {
                            if (!plan.plan_id)
                                delete self.selected_timeslots[index]['plans'][ind];
                        })
                    if (Object.keys(self.selected_timeslots[index]['plans']).length == 0)
                        delete self.selected_timeslots[index];
                });
                if (input_date) {
                    var temp = input_date.split('/');
                    input_date = temp[1] + '/' + temp[0] + '/' + temp[2];
                }
                rpc.query({
                        method: 'create_booking_order',
                        model: 'booking.order',
                        args: [self.selected_timeslots, product_id, input_date, partner_id, self.env.pos.config.company_id[0], self.env.pos.table ? self.env.pos.table['id'] : null]
                    }).then(function (res) {
                        console.log("Ressssssssss",res);
                        self.showPopup('WkOrderCreateNotifyPopupWidget', {
                            'title': 'Order Created!!',
                            'body': 'Your Order Has Been Successfully Created!!'
                        })
                        if (res && res.length) {
                            _.each(res, function (data) {
                                self.env.pos.db.pos_all_bookings.unshift(data);
                                self.env.pos.db.booking_by_id[data.id] = data;

                                var date = data.booking_date;
                                var date_list = date.split('-');
                                var new_formatted_date = date_list[2] + '.' + date_list[1] + '.' + date_list[0];
                                data['new_formatted_date'] = new_formatted_date;
                                self.env.pos.db.pos_all_bookings.push(data);
                                self.env.pos.db.booking_by_id[data.id] = data;

                                if (Object.keys(self.env.pos.db.booking_by_date).indexOf(data.new_formatted_date) >= 0) {
                                    self.env.pos.db.booking_by_date[data.new_formatted_date].push(data.id)
                                } else {
                                    self.env.pos.db.booking_by_date[data.new_formatted_date] = [data.id];
                                }
                                self.env.pos.db.booking_by_date[data.new_formatted_date].sort(function (first, second) {
                                    if (self.env.pos.db.booking_by_id[first].time_slot_initial > self.env.pos.db.booking_by_id[second].time_slot_initial) return 1;
                                    if (self.env.pos.db.booking_by_id[first].time_slot_initial < self.env.pos.db.booking_by_id[second].time_slot_initial) return -1;
                                })
                            });
                        }
                    })
                    .catch(function (e) {
                        self.showPopup('Error', {
                            'title': _t('The booking could not be approved'),
                            'body': _t('Check your internet connection and try again.')
                        });
                    });

                // });
            }
            filter_now (e) {
                var self = this;
                // $('.popup').on('click', '.filter-now', function (e) {
                    console.log("efilter rnow ",e)
                    var start = $('.filter-start option:selected').val();
                    var end = $('.filter-end option:selected').val();
                    _.each($('.timeslot'), function (slot) {
                        var start_time = parseInt($(slot).attr('data-start_time'));
                        var end_time = parseInt($(slot).attr('data-start_time'));
                        if (start_time >= start && end_time < end)
                            $(slot).show();
                        else
                            $(slot).hide();
                    });
                    if ($('.timeslot[data-start_time=' + start + ']').length) {
                        $('.timeslot[data-start_time=' + start + ']').addClass('active_slot');
                        var time_slot_id = parseInt($('.timeslot[data-start_time=' + start + ']').data('time_slot_id'), 10);
                        var slots_plans = self.slot_plans[time_slot_id];
                        console.log("slots_plans",slots_plans)
                        var new_html = QWeb.render('SlotPlans', {
                            'd_plans': slots_plans,
                            'widget': self.env
                        });
                        $('.bk_plans_m_div').html(new_html);
                        self.selected_timeslots = {};
                        self.selected_timeslots[time_slot_id] = {
                            'start_time': parseInt($('.timeslot[data-start_time=' + start + ']').data('start_time'), 10),
                            'end_time': parseInt($('.timeslot[data-start_time=' + start + ']').data('end_time'), 10),
                            'plans': {}
                        };
                    } else {
                        var new_html = QWeb.render('BlankSlots', {});
                        $('.bk_plans_m_div').html(new_html);
                    }
                // });
            }
            click_input_date(){
              $('.wk-error-text').text('');
            }
            renderBookingForm () {
                var self = this;
                $('.popup').on('change', '.bk_qty_sel', function (e) {
                    var plans = $('.plan_available.active_plan');
                    var time_slot_id = false;
                    if (plans.length)
                        time_slot_id = plans[0].attr('slot')
                    if (time_slot_id)
                        self.selected_timeslots[parseInt(time_slot_id)]['qty'] = parseInt($('.bk_qty_sel option:selected').val(), 10);
                    var price = 0;
                    _.each(self.selected_timeslots, function (data, index) {
                        if (data.qty && data.plan_price)
                            price += data.qty * data.plan_price
                    })
                    if (price);
                    $('.bk_total_price').text(price);
                });
                $('.plan_available').click(function (res) {
                    console.log("click main")
                });
                $('.popup').off().on('click', '.plan_available', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var time_slot_id = $(e.currentTarget).attr('slot');
                    if (self.selected_timeslots[parseInt(time_slot_id)]) {
                        $('.wk-error-text').text('');
                        var plan_id = parseInt($(e.currentTarget).find('input').attr('id'), 10);
                        if ($(e.currentTarget).hasClass('active_plan')) {
                            $(e.currentTarget).find('.bk_plan_div').removeClass('active_current_plan');
                            $(e.currentTarget).removeClass('active_plan');
                            delete self.selected_timeslots[parseInt(time_slot_id)]['plans'][plan_id]
                        } else {
                            var max_qty_available = $(e.currentTarget).find('.max_qty_available').text();
                            if (parseInt(max_qty_available) > 0) {
                                $('.max_capacity').text('(Maximum capacity is ' + max_qty_available + ')');
                                $('.bk_qty_sel').empty();
                                for (var i = 1; i <= max_qty_available; i++) {
                                    $('.bk_qty_sel').append('<option value="' + i + '">' + i + '</option>');
                                }
                            }
                            if (!$(e.currentTarget).hasClass('bk_disable')) {
                                $(e.currentTarget).find('.bk_plan_div').addClass('active_current_plan');
                                $(e.currentTarget).addClass('active_plan');
                                self.selected_timeslots[parseInt(time_slot_id)]['plans'][plan_id] = {};
                                self.selected_timeslots[parseInt(time_slot_id)]['plans'][plan_id]['qty'] = 1;
                                self.selected_timeslots[parseInt(time_slot_id)]['plans'][plan_id]['plan_id'] = plan_id
                                self.selected_timeslots[parseInt(time_slot_id)]['plans'][plan_id]['plan_price'] = parseInt($(e.currentTarget).find('.plan_price').text(), 10);
                                self.selected_timeslots[parseInt(time_slot_id)]['plans'][plan_id]['plan_name'] = $(e.currentTarget).find('.plan_name').text().trim();
                                self.selected_timeslots[parseInt(time_slot_id)]['plans'][plan_id]['plan'] = parseInt($(e.currentTarget).find('.plan_price').attr('plan-id'), 10);
                                self.selected_timeslots[parseInt(time_slot_id)]['plans'][plan_id]['max_qty_available'] = parseInt($(e.currentTarget).find('.max_qty_available').text());
                            }
                        }
                        var price = 0;
                        _.each(self.selected_timeslots, function (data, index) {
                            if (data.plans && Object.keys(data.plans).length)
                                _.each(data.plans, function (plan, ind) {
                                    if (plan.qty && plan.plan_price)
                                        price += plan.qty * plan.plan_price;
                                })
                        })
                        $('.bk_total_price').text(price);
                        var data_html = QWeb.render('BookingSummary', {
                            data: self.selected_timeslots
                        });
                        $('.booking_summary').html(data_html);
                    } else {
                        $('.wk-error-text').text('Please Select a timeslot!!');
                    }
                });



                $('.popup').on('click', '.timeslot', function (e) {
                    $('.bk_qty_sel option:first').attr('selected', true);

                    var time_slot_id = parseInt($(e.currentTarget).data('time_slot_id'), 10);
                    var slots_plans = self.slot_plans[time_slot_id];
                    if (!$(e.currentTarget).hasClass('active_slot')) {
                        $(e.currentTarget).addClass('active_slot');
                        self.selected_timeslots[time_slot_id] = {
                            'start_time': parseInt($(e.currentTarget).data('start_time'), 10),
                            'end_time': parseInt($(e.currentTarget).data('end_time'), 10),
                            'slot_name': $(e.currentTarget).text().trim(),
                            'plans': {}
                        };
                    } else {
                        var active_plan_slot = $('.plan_available.active_plan').attr('slot');
                        var current_slot_text = $(e.currentTarget).text();
                        var selected_Slot_text = $('.selected_slot').text();
                        if (time_slot_id == active_plan_slot || (current_slot_text == selected_Slot_text && !active_plan_slot)) {
                            delete self.selected_timeslots[time_slot_id];
                            $(e.currentTarget).removeClass('active_slot');
                        }
                        if ($('.timeslot.active_slot').length == 0 || time_slot_id == active_plan_slot) {
                            $('.plan_available .bk_plan_div').removeClass('active_current_plan');
                            $('.plan_available').removeClass('active_plan');
                        }
                    }
                    var new_html = QWeb.render('SlotPlans', {
                        'd_plans': slots_plans,
                        'widget': self.env
                    });
                    $('.bk_plans_m_div').html(new_html);
                    if (self.selected_timeslots[time_slot_id] && self.selected_timeslots[time_slot_id]['plans'] && Object.keys(self.selected_timeslots[time_slot_id]['plans']).length) {
                        _.each(self.selected_timeslots[time_slot_id]['plans'], function (plan) {
                            $('.plan_available input[id=' + plan.plan_id + ']').siblings().addClass('active_current_plan');
                            $('.plan_available input[id=' + plan.plan_id + ']').closest('.plan_available').addClass('active_plan');
                        })
                    }
                    $('.selected_slot').text($(e.currentTarget).text());
                    if ($('.timeslot.active_slot').length > 0)
                        _.each($('.timeslot.active_slot'), function (data, index) {
                            let temp_slot = parseInt($(data).data('time_slot_id'), 10);
                            if (self.selected_timeslots[temp_slot] && self.selected_timeslots[temp_slot].plans && Object.keys(self.selected_timeslots[temp_slot].plans).length == 0 && temp_slot != time_slot_id) {
                                $(data).removeClass('active_slot');
                                delete self.selected_timeslots[temp_slot];
                            }
                        });
                    var data_html = QWeb.render('BookingSummary', {
                        data: self.selected_timeslots
                    });
                    $('.booking_summary').html(data_html);
                });


                $('.popup').on('click', '.change_date', function (e) {
                    self.cancel();
                    self.showScreen('ProductScreen');
                    console.log("$('article[area",$('article[data-product-id="'+self.props.product_id+'"]'))
                    if($('article[data-product-id="'+self.props.product_id+'"]').length > 0)
                        $('article[data-product-id="'+self.props.product_id+'"]').click()
                });

                $('.popup').on('change', '.booking_dates', function (e) {
                    if(!self.is_changed){
                        self.is_changed = true;
                        var input_date = $('.booking_dates').val();
                        self.all_slots = [];
                        if (input_date) {
                            var selected_date = new Date(input_date);
                            var month = selected_date.getMonth();
                            month = parseInt(month) + 1 ;
                            var string_to_add = '-';
                            if(month.toString().length == 1)
                              string_to_add+= 0;
                            var new_date = selected_date.getFullYear()+string_to_add+ month+'-';
                            if(selected_date.getDate() < 10)
                                new_date += '0'+selected_date.getDate();
                            else
                                new_date += selected_date.getDate()
                            console.log("new date",new_date)
                            console.log("selected_date",selected_date,new Date($('#bk_datepicker').attr('data-bk_end_date')));
                            if(selected_date < new Date($('#bk_datepicker').attr('data-bk_default_date')) || selected_date > new Date($('#bk_datepicker').attr('data-bk_end_date'))){
                                $(".wk-error-text").text("You Cannot Book A Reservation Before/Beyond The Booking Range.")
                                self.is_changed = false;
                                return;
                              }
                            if($('#bk_datepicker').attr('data-closing-day').includes(new_date)){
                                  $(".wk-error-text").text("You Cannot Book A Reservation On Closing Days.")
                                  self.is_changed = false;
                                  return;
                            }
                            var temp = input_date.split('/');
                            input_date = temp[1] + '/' + temp[0] + '/' + temp[2];
                        }
                        rpc.query({
                                'method': 'update_booking_slots',
                                'model': 'pos.order',
                                'args': [self.props.product_tmpl_id, input_date, self.env.pos.table ? self.env.pos.table['id'] : null]
                            })
                            .then(function (result) {
                                console.log("****Result******",result)
                                if (result.day_slots.length == 0) {
                                    $('.body').html('<div>No slots are available for the day.</div>');
                                    $('.button.book').hide();
                                    return false;
                                }
                                $('.proceed-date').hide();
                                $('.book').show();
                                var core = require('web.core');
                                var qweb = core.qweb;
                                var max_bk_qty = [];
                                for (var i = 2; i <= self.props.max_bk_qty; i++) {
                                    max_bk_qty.push(i);
                                }
                                result['widget'] = self.env;
                                result['input_date'] = input_date;
                                var start_times = [];
                                var end_times = [];
                                _.each(result.day_slots, function (slot) {
                                    start_times.push(slot.slot.start_time);
                                    end_times.push(slot.slot.end_time);
                                });
                                console.log("start_times.sort()",start_times.sort(function(a, b) {
                                                                        return a - b;
                                                                      }))
                                result['start_time_list'] = start_times.sort(function(a, b) {
                                                                        return a - b;
                                                                      });
                                result['end_time_list'] = end_times.sort(function(a, b) {
                                                                        return a - b;
                                                                      });;
                                result['max_bk_qty'] = max_bk_qty;
                                result['max_qty'] = self.props.max_qty;
                                self.slot_plans = {};
                                _.each(result.day_slots, function (slot) {
                                    self.slot_plans[slot.slot.id] = slot.plans;
                                })
                                self.all_slots = result.day_slots;
                                console.log("****self.all_slots***",self.all_slots)
                                var html = qweb.render('BookingTimeSlot', result);
                                $('.datepicker_div').hide();
                                $('.book_booking_form').append(html);
                                $('.date_hide').show();
                                $('.timeslot:first').addClass('active_slot');
                                var time_slot_id = parseInt($('.timeslot.active_slot').data('time_slot_id'), 10);
                                self.selected_timeslots[time_slot_id] = {
                                    'start_time': parseInt($('.timeslot.active_slot').data('start_time'), 10),
                                    'end_time': parseInt($('.timeslot.active_slot').data('end_time'), 10),
                                    'slot_name': $('.timeslot.active_slot').text().trim(),
                                    'plans': {}
                                };
                            })
                            // .catch(function (e) {
                            //     self.showPopup('ErrorPopup', {
                            //         'title': _t('The booking could not be approved'),
                            //         'body': _t('Check your internet connection and try again.')
                            //     });
                            // });
                    }
                });
            }
        }
        // gui.define_popup({
        //     name: 'WkBookReservationPopUp,
        //     widget: BookReservationPopUp
        // });
        WkBookReservationPopUp.template = 'WkBookReservationPopUp';
        WkBookReservationPopUp.defaultProps = {
            title: 'Confirm ?',
            body: '',
        };

        Registries.Component.add(WkBookReservationPopUp);


    const PosProductScreen = (ProductScreen) =>
		class extends ProductScreen {
            mounted () {
                var self = this;
                // self._super();
                super.mounted();
                if (self.env.pos.db.booking_config)
                    setInterval(self.check_for_completion_booking, 20000,self);
            }
            check_for_completion_booking(self) {
                // var self = this;
                var reminder_time = self.env.pos.db.booking_config.reminder_timing;
                rpc.query({
                    model: 'booking.order',
                    method: 'check_for_completion_booking',
                }).then(function (result) {
                    console.log("resultttt",result,this,self)
                    if (result.length)
                        self.showPopup('WkAlertPopUp', {
                            'data': result,
                            'reminder_time': reminder_time
                        })
                });

            }

			async _clickProduct(event) {
                var self = this;
                const product = event.detail;
                console.log("rppodouct",product)
                if (product.is_booking_type) {
                    if (self.env.pos.get_order() && self.env.pos.get_order().get_client())
                        if (self.env.pos.db.booking_config)
                            rpc.query({
                                'method': 'get_booking_reservation_data',
                                'model': 'pos.order',
                                'args': [product.product_tmpl_id, self.env.pos.table? self.env.pos.table['id'] : null]
                            }).
                    then(function (res) {
                            if (res.booking_status) {
                                var w_c_days = self.get_w_closed_days(res.w_closed_days);
                                res['w_c_days'] = w_c_days;
                                res['product_tmpl_id'] = product.product_tmpl_id;
                                res['product_id'] = product.id;
                                var closing_days = [];
                                var closing_day_list = product.closing_days;
                                closing_day_list = closing_day_list.concat(self.env.pos.db.booking_config.closing_days)
                                _.each(closing_day_list, function (day) {
                                    closing_days.push(self.env.pos.db.booking_close_days[day].date);
                                });
                                res['closing_days'] = closing_days;
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
                              //  res['end_date'] = date.getFullYear() + '-' + month + '-' + date.getDate();
                                  res['default_date'] = res.br_start_date
                                  res['end_date'] = res.br_end_date
                                // }
                                if (product.max_bk_qty > 0)
                                    res['max_bk_qty'] = product.max_bk_qty;
                                else
                                    res['max_bk_qty'] = 5;
                                res['max_qty'] = res['max_bk_qty'];
                                console.log("Resssssssssss",res)
                                self.showPopup('WkBookReservationPopUp', res);
                            }
                            else
                                self.showPopup('Error', {
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
                    else {
                        console.log("111111111")
                        self.showPopup('ErrorPopup', {
                            'title': _t('No Booking Config!!'),
                            'body': _t('There is no active booking configuration.')
                        });
                    }
                    else {
                        console.log("2222222222222")
                        const { confirmed } = await self.showPopup('ConfirmPopup', {
                            title: self.env._t('Please select the Customer'),
                            body: self.env._t(
                                'You need to select the customer before you can book an appointment.'
                            ),
                        });
                        if (confirmed) {
                            var currentOrder = self.env.pos.get_order();
                            const currentClient = currentOrder.get_client();
                            const { confirmed, payload: newClient } = await self.showTempScreen(
                                'ClientListScreen',
                                { client: currentClient }
                            );
                            if (confirmed) {
                                currentOrder.set_client(newClient);
                                currentOrder.updatePricelist(newClient);
                            }
                        }
                    }
                } else{
                    console.log("3333333")
                    super._clickProduct(event);

                }
            }

            get_w_closed_days(w_c_days) {
                var data = JSON.parse(w_c_days).map(day => Days[day])
                return JSON.stringify(data)
            }
		}

	Registries.Component.extend(ProductScreen, PosProductScreen);


        models.Order = models.Order.extend({
            initialize: function (attributes, props) {
                SuperOrder.initialize.call(this, attributes, props);
                this.booking_id = false;
                this.booking_date = false;
                this.is_checkin = false;
            },
            export_as_JSON: function () {
                var self = this;
                var order_json = SuperOrder.export_as_JSON.call(this);
                order_json.booking_id = self.booking_id;
                order_json.is_checkin = self.is_checkin;
                return order_json;
            },
            init_from_JSON: function (json) {
                var self = this;
                setTimeout(function () {
                    self.is_checkin = json.is_checkin;
                    // if (self.pos && self.pos.gui && self.pos.gui.screen_instances && self.pos.gui.screen_instances.products)
                    //     self.pos.gui.screen_instances.products.show()
                    // Gui.showTempScreen('ProductScreen',{});
                }, 1000);
                SuperOrder.init_from_JSON.call(this, json);
            },

            // add_product: function (product, props) {
            //     var res = SuperOrder.add_product.call(this, product, props);
            //     if (props && props.is_paid_line)
            //         this.get_selected_orderline().is_paid_line = true;
            //     return res;
            // }

        });



        models.Orderline = models.Orderline.extend({
            get_orderline_paid_status: function () {
                var self = this;
                // var display_price = self.get_display_price();
                // var tax_price = self.get_tax();
                // var price_without_tax = self.get_price_without_tax();
                // if(tax_price == 0)
                //     return '';
                // if(display_price == price_without_tax)
                //     return "Tax: +"+self.pos.chrome.screens.scale.format_currency(tax_price);
                // else
                //     return "Tax: -"+self.pos.chrome.screens.scale.format_currency(tax_price);
            }
        });



        models.PosModel = models.PosModel.extend({
            delete_current_order:function(){
                var self = this;
                var order = self.get_order();
                clearInterval(order.timer_interval);
                SuperPosModel.delete_current_order.call(self);

            },
            get_remaining_time:function(end_time){
                var dateNow = new Date();

                var seconds = Math.floor((end_time - (dateNow))/1000);
                var minutes = Math.floor(seconds/60);
                var hours = Math.floor(minutes/60);
                var days = Math.floor(hours/24);

                hours = hours-(days*24);
                minutes = minutes-(days*24*60)-(hours*60);
                seconds = seconds-(days*24*60*60)-(hours*60*60)-(minutes*60);
                if(hours.toString().length < 2)
                    hours = '0'+hours.toString();
                if(minutes.toString().length < 2)
                    minutes = '0'+minutes.toString();
                if(seconds.toString().length < 2)
                    seconds = '0'+seconds.toString();
                return hours+':'+minutes+':'+seconds
            },
            is_booking_order: function () {
                var self = this;
                var is_booking_order = false;
                if (self.env.pos.get_order()){
                    _.each(self.env.pos.get_order().get_orderlines(), function (line) {
                        if (line.product.is_booking_type) {
                            is_booking_order = true;
                            return true;
                        }
                    });
                }
                return is_booking_order;
            },


            update_bookings: function () {
                var self = this;
                var promise = rpc.query({
                    'method': 'update_booking_state',
                    'model': 'booking.order',
                    'args': [Object.keys(self.db.booking_by_id), self.company.id]
                }).then(function (data) {
                    console.log("Dataaaaaaaaaaa",data)
                    if (data) {
                        if (data.booking_states)
                            _.each(data.booking_states, function (obj) {
                                self.db.booking_by_id[obj.id.toString()]['state'] = obj.state;
                                self.db.booking_by_id[obj.id.toString()]['end_time'] = obj.end_time;
                                self.db.booking_by_id[obj.id.toString()]['quantity'] = obj.quantity;
                            })
                        if (data.new_booking_data) {
                            _.each(data.new_booking_data, function (res) {
                                var date = res.booking_date;
                                var date_list = date.split('-');
                                var new_formatted_date = date_list[2] + '.' + date_list[1] + '.' + date_list[0];
                                res['new_formatted_date'] = new_formatted_date;
                                self.db.pos_all_bookings.push(res);
                                self.db.booking_by_id[res.id] = res;

                                if (Object.keys(self.db.booking_by_date).indexOf(res.new_formatted_date) >= 0) {
                                    self.db.booking_by_date[res.new_formatted_date].push(res.id)
                                } else {
                                    self.db.booking_by_date[res.new_formatted_date] = [res.id];
                                }
                                self.db.booking_by_date[res.new_formatted_date].sort(function (first, second) {
                                    if (self.db.booking_by_id[first].time_slot_initial > self.db.booking_by_id[second].time_slot_initial) return 1;
                                    if (self.db.booking_by_id[first].time_slot_initial < self.db.booking_by_id[second].time_slot_initial) return -1;
                                })
                                // })
                            })
                        }
                    }
                });
                return promise
            },
        })


    });
