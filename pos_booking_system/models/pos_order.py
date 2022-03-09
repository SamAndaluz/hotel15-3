# -*- coding: utf-8 -*-
#################################################################################
#
#   Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>)
#   See LICENSE file for full copyright and licensing details.
#   License URL : <https://store.webkul.com/license.html/>
#
#################################################################################

# from odoo import api, models,_,fields,http
# import math
# # from datetime import datetime
# from dateutil.relativedelta import relativedelta
# from odoo.tools import DEFAULT_SERVER_DATE_FORMAT, DEFAULT_SERVER_DATETIME_FORMAT
# # from odoo.http import self
# import ast
# import json
# from datetime import date, timedelta, datetime
# import logging, pytz
from odoo.exceptions import ValidationError,Warning
from odoo import api, tools, _,models,fields
import pytz
from dateutil.relativedelta import relativedelta
import random
import string
from odoo.http import request
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
from datetime import datetime, timedelta
from datetime import date, timedelta, datetime

import ast
import json
import logging
_logger = logging.getLogger(__name__)


Days = {
    0 : 'mon',
    1 : 'tue',
    2 : 'wed',
    3 : 'thu',
    4 : 'fri',
    5 : 'sat',
    6 : 'sun',
}


WeekDays = {
    'sun':'Sunday',
    'mon':'Monday',
    'tue':'Tuesday',
    'wed':'Wednesday',
    'thu':'Thursday',
    'fri':'Friday',
    'sat':'Saturday',
}



class BookingSlot(models.Model):
    _inherit = 'booking.slot'

    booking_ids = fields.Many2many('booking.order','related_slots',string="Booking Ids")
    company_id = fields.Many2one('res.company', string='Company', required=True, readonly=True, default=lambda self: self.env.user.company_id)


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    min_booking_time = fields.Integer(string="Min Booking ")
    flexible_time_extension = fields.Boolean(string="Flexible Time Extension")
    closing_days = fields.Many2many('booking.closing.day',string="Closing Days")
    # exclusive_for_member = fields.Boolean(string="Exclusive For Member")

    @api.model
    def get_bk_slot_available_qty(self, bk_date, slot_plan_id):
        """ Return: Total quantity available on a particular date in a provided slot.
            bk_date: Date on with quantity will be calculated.
            slot_plan_id: Plan in any slot on with quantity will be calculated."""
        slot_plan_obj = self.env["booking.slot"].browse([int(slot_plan_id)])
        sol_objs = self.env['booking.order'].search([('booking_date','=',bk_date),('state','!=','cancel'),('plan_id','=',slot_plan_obj.plan_id.id)])
        b_orders = sol_objs.filtered(lambda l: slot_plan_obj.time_slot_id.id in l.time_slot_ids.ids)
        _logger.info("*********slot paln qty********%r******%r",slot_plan_obj.quantity , sum(b_orders.mapped('quantity')))
        return slot_plan_obj.quantity - sum(b_orders.mapped('quantity'))


    def get_booking_slot_for_day(self, sel_date):
        """Return: List of slots and their plans with qty and price of a day"""
        self.ensure_one()
        day = Days[sel_date.weekday()]
        day_config = self.booking_day_slot_ids.filtered(lambda day_sl: day_sl.name == day and day_sl.booking_status == 'open')
        day_slots = day_config.booking_slots_ids
        time_slots = day_slots.mapped('time_slot_id')
        _logger.info("**%r******slotssssssss********%r",time_slots, sel_date)
        time_slots = self.get_available_day_slots(time_slots, sel_date)
        slots_plans_list = []
        _logger.info("********Tie slots********%r",time_slots)
        for slot in time_slots:
            d1 = {}
            d2 = []
            d1['slot'] = {
                'name' : slot.name_get()[0][1],
                'id' : slot.id,
                'start_time':slot.start_time,
                'end_time':slot.end_time
            }
            d_slots = day_slots.filtered(lambda r: r.time_slot_id.id == slot.id)

            closing = [day.date.strftime('%m/%d/%Y') for day in self.closing_days]
            booking_config = self.env['booking.config'].sudo().search([('active_record','=',True),('company_id','=',self.env.user.company_id.id)])
            if booking_config and booking_config.closing_days:
                config_closing_days = [ close_day.date.strftime('%m/%d/%Y') for close_day in booking_config.closing_days]
                closing.extend(config_closing_days)

            for d in d_slots:
                d2.append({
                    'name' : d.plan_id.name,
                    'id' : d.id,
                    'avl_qty':self.get_bk_slot_available_qty(sel_date,d.id),
                    'qty' : d.quantity,
                    'price' : d.price,
                    'plan_id':d.plan_id.id,
                    # 'is_exclusive':d.is_exclusive,
                    'slot':slot.id,
                    'start_time':str(d.time_slot_id.start_time).split('.')[0],
                    'end_time':str(d.time_slot_id.end_time).split('.')[0],
                    'closing': closing,
                })
            d1['plans'] = d2
            slots_plans_list.append(d1)
        return slots_plans_list




class BookingClosingDay(models.Model):
    _name = 'booking.closing.day'

    name = fields.Char(string="Closing Day")
    date = fields.Date(string="Closing Date")


class BookingConfig(models.Model):
    _name = "booking.config"

    closing_days = fields.Many2many('booking.closing.day',string="Closing Days(Applied On Every Product)")
    time = fields.Integer(string="Paylater Time Limit(in Hours)")
    active_record = fields.Boolean(String="Active")
    name = fields.Char(string="Name")
    reminder_timing = fields.Integer(string="Booking Reminder")
    company_id = fields.Many2one('res.company', string='Company', required=True, readonly=True, default=lambda self: self.env.user.company_id)
    exclusive_time_slots = fields.Many2many('booking.time.slot',string="Exclusive Time Slots")
    time_to_reschedule = fields.Integer(string="Time For Reschedule")
    type_of_reschedule_time = fields.Selection([('days','Days'),('hours','Hours')],default="days")
    reschedule_limit = fields.Integer(string="Reschedule Limit")
    booking_range = fields.Integer(string="Booking Range")
    type_of_booking_range = fields.Selection([('days','Days'),('months','Months'),('years','Years')],default="days")
    is_send_mail = fields.Boolean(string="Is Send Mail")




    @api.constrains('closing_days')
    def validate_closing_days(self):
        saved_data = self.env["booking.closing.day"].browse(self.closing_days.ids)
        for rec in saved_data:
            bookings = self.env['booking.order'].search([('booking_date','=',rec.date),('company_id','=',self.company_id.id),('state','not in',['done','cancel'])])
            if len(bookings) > 0:
                booking_str = ', '.join([booking.name for booking in bookings])
                raise Warning(_("There are some bookings ("+booking_str+") on date "+rec.date.strftime("%m/%d/%Y")+" which are still pending."))


    @api.constrains('active_record')
    def validate_single_record(self):
        records = self.search([('company_id','=',self.env.user.company_id.id)])
        count = 0
        for record in records:
            if record.active_record == True:
                count += 1
        if(count >1):
            raise ValidationError("You can't have two active records.")



class SaleOrder(models.Model):
    _inherit = 'sale.order'

    booking_id = fields.Many2one('booking.order',string="Booking Order")

    @api.model
    def paylater_expiry_check_scheduler(self):
        orders = self.search([('is_booking_type','=',True),('state','=','paylater')])
        active_time = self.env['booking.config'].search([('active_record','=',True),('company_id','=',self.env.user.company_id.id)],limit=1)
        time = 48
        if active_time:
            time = active_time.time
        if len(orders):
            order_to_cancel = orders.filtered(lambda order:datetime.strptime(order.date_order.strftime("%Y-%m-%d %H:%M:%S") ,DEFAULT_SERVER_DATETIME_FORMAT)+ timedelta(hours=time) < datetime.strptime(fields.Datetime.now().strftime("%Y-%m-%d %H:%M:%S"), DEFAULT_SERVER_DATETIME_FORMAT))
            order_to_cancel.write({'state':'cancel'})
            for order in order_to_cancel:
                booking_order_line = order.order_line.filtered(lambda line: line.booking_order_id)
                if len(booking_order_line):
                    for line in booking_order_line:
                        line.booking_order_id.state = 'cancel'


    def write(self,vals):
        res = super(SaleOrder,self).write(vals)
        for obj in self:
            if obj.state == 'sale':
                is_booking_order = obj.order_line.filtered(lambda line: line.booking_order_id)

                if len(is_booking_order):
                    if len(is_booking_order.booked_plan_id)>1:
                        BO = self.env['booking.order'].sudo().search([('sale_order_id','=',obj.id)])

                        for bo in BO:
                            bo.state='paid'
                    else:
                        is_booking_order.booking_order_id.state = 'paid'
        return res


class SaleOrderLine(models.Model):
    _inherit = "sale.order.line"

    booking_order_id = fields.Many2one('booking.order',string="Booking Order")
    booking_slot_ids = fields.Many2many("booking.slot", string="Booking Slots", copy=False)
    booking_slot_id = fields.Many2one("booking.slot", string="Booking Slots", copy=False)
    booking_date = fields.Date(string="Booking Date", copy=False)
    time_slot_ids = fields.Many2many("booking.time.slot", string="Booked Time Slot", store=True)
    booked_plan_id = fields.Many2many("booking.plan", string="Booked Plan", store=True)

    resceduling_count = fields.Integer('Resceduling Count for partner.',default=0)

    @api.model
    def create(self,vals):
        res = super(SaleOrderLine,self).create(vals)
        for obj in res:
            if obj.product_id.is_booking_type:
                if len(obj):
                    other_products = obj.order_id.order_line - obj
                    new_vals = {}
                    new_vals.update({
                        'customer':obj.order_id.partner_id.id,
                        'sale_order_id':obj.order_id.id,
                        'booking_product_id':obj.product_id.id,
                        'quantity':obj.product_uom_qty,
                        'state':'draft',
                        'booking_source':'website',
                        'reschedule_use':0,
                        'name':''.join(random.choices(string.digits + string.ascii_uppercase , k = 7)),
                        'plan_price':obj.price_unit,
                        'booking_date':obj.booking_date,
                    })
                    if len(other_products):
                        extra_lines = []
                        for line in other_products:
                            extra_lines.append([0,0,{
                                'product_id':line.product_id.id,
                                'qty':line.product_uom_qty,
                                'price_subtotal_incl':line.price_subtotal_incl,
                                'price_unit':line.price_unit
                            }])
                        if len(extra_lines):
                            new_vals.update({
                                'extra_lines_ids':new_vals
                            })
                    booking = self.env['booking.order'].create(new_vals)
                    obj.booking_order_id = booking.id
                    obj.order_id.booking_id = booking.id
        return res

    def write(self,vals):
        res = super(SaleOrderLine,self).write(vals)
        for obj in self:
            if vals.get('product_uom_qty'):
                if obj.booking_order_id:
                    obj.booking_order_id.quantity = vals.get('product_uom_qty')
            if vals.get('booking_slot_ids'):
                time_slot_ids = [slot.time_slot_id.id for slot in obj.booking_slot_ids]
                obj.booking_order_id.time_slot_id = obj.booking_slot_ids.mapped('time_slot_id')[0].id
                obj.booking_order_id.write({'booking_slot_ids':[(6,0,obj.booking_slot_ids.ids)]})
                obj.booking_order_id.write({'time_slot_ids':[(6,0,time_slot_ids)]})
                obj.price_unit = obj.price_unit
                obj.booking_order_id.booking_date = obj.booking_date

                if len(obj.booked_plan_id)> 1:
                    obj.booking_order_id.plan_id = obj.booked_plan_id[0].id
                    for other_booking in obj.booked_plan_id[1:]:
                        new_obj=obj.booking_order_id.copy()
                        new_obj.plan_id = other_booking.id
                else:
                    obj.booking_order_id.plan_id = obj.booked_plan_id.id
        return res


class BookingOrder(models.Model):
    _name = 'booking.order'
    _order = 'id desc'

    name = fields.Char(string="Booking Name")
    order_name = fields.Char(string="Order Name")
    booking_slot_id = fields.Many2one('booking.slot',string="Booking Slot")
    booking_slot_ids = fields.Many2many('booking.slot','related_slots',string="Booking Slot")
    company_id = fields.Many2one('res.company', string='Company', required=True, readonly=True, default=lambda self: self.env.user.company_id)
    pos_order_id = fields.Many2one('pos.order',string="Pos Order Id")
    sale_order_id = fields.Many2one('sale.order',string="Sale Order Id")
    booking_product_id = fields.Many2one('product.product',string="Booking Product")
    quantity = fields.Integer(string="Quantity")
    state = fields.Selection([('draft','Draft'),('in_progress','In Progress'),('paid','Paid'),('done','Done'),('cancel','Cancel'),('expired','Expired')],string="State",default="draft")
    booking_source = fields.Selection([('website','Website'),('pos','Point Of Sale')],string="Booking Source")
    end_time = fields.Char(compute="_compute_end_time",string="End Time")
    checkout = fields.Datetime(string="Check Out")
    plan_price = fields.Float(string="Plan Price")
    booking_date = fields.Date(string="Booking Date")
    customer = fields.Many2one('res.partner',string="Customer")
    time_slot_id = fields.Many2one('booking.time.slot', string="Booked Slot", store=True)
    time_slot_ids = fields.Many2many('booking.time.slot',string="Booked Slot", store=True)
    plan_id = fields.Many2one('booking.plan', string="Booked Plan", store=True)
    extra_lines_ids = fields.One2many('booking.order.line','related_order',string="Extra Line IDs")
    reschedule_use = fields.Integer(string="Reschedule Left")
    is_notification_sent = fields.Boolean(string="Is Notification Sent")


    @api.depends('time_slot_ids')
    def _compute_end_time(self):
        for self_obj in self:
            _logger.info("************self.obj.timeslots*********%r",self_obj.time_slot_ids)
            if self_obj.time_slot_ids and len(self_obj.time_slot_ids) > 0:
                all_end_times = [i.end_time for i in self_obj.time_slot_ids]
                _logger.info("*****888all_end_times*****%r",all_end_times)
                self_obj.end_time = max(all_end_times)
            else:
                self_obj.end_time = 0.0
        # pass
    @api.model
    def booking_expiry_check_scheduler(self):
        bookings = self.search([('state','not in',['cancel','done','expired'])])
        # order_to_cancel = orders.filtered(lambda order:datetime.strptime(order.date_order.strftime("%Y-%m-%d %H:%M:%S") ,DEFAULT_SERVER_DATETIME_FORMAT)+ timedelta(hours=time) < datetime.strptime(fields.Datetime.now().strftime("%Y-%m-%d %H:%M:%S"), DEFAULT_SERVER_DATETIME_FORMAT))
        for booking in bookings:
            _logger.info("********888booking.booking_slot_ids******%r",booking.booking_slot_ids)
            booking_time = booking.booking_date
            if booking.booking_slot_ids:
                timeslots = [i.time_slot_id.end_time for i in booking.booking_slot_ids]
                booking_time += timedelta(hours=max(timeslots or 0))
            _logger.info("*%r*********booking time**********%r",datetime.strptime(fields.Datetime.now().strftime("%Y-%m-%d %H:%M:%S"), DEFAULT_SERVER_DATETIME_FORMAT),datetime.strptime(booking_time.strftime("%Y-%m-%d %H:%M:%S") ,DEFAULT_SERVER_DATETIME_FORMAT))
            if datetime.strptime(fields.Datetime.now().strftime("%Y-%m-%d %H:%M:%S"), DEFAULT_SERVER_DATETIME_FORMAT) >= datetime.strptime(booking_time.strftime("%Y-%m-%d %H:%M:%S") ,DEFAULT_SERVER_DATETIME_FORMAT):
                _logger.info("*****inside************")
                booking.state = 'expired'



    @api.model
    def extend_booking_order(self,time_slot_ids,booking_id,plan_id,booking_date):
        booking = self.browse(booking_id)
        slots = []
        new_date = datetime.strptime(booking_date,'%d/%m/%Y').date()
        weekday = Days[new_date.weekday()]
        for slot in time_slot_ids:
            booking_slot = self.env['booking.slot'].search([('company_id','=',self.env.user.company_id.id),('time_slot_id','=',slot),('plan_id','=',plan_id),('slot_config_id.name','=',weekday)])
            if booking_slot:
                booking.write({
                    'booking_slot_ids':[(4,booking_slot.id)],
                    'time_slot_ids':[(4,booking_slot.time_slot_id.id)]
                })



    @api.model
    def reschedule_booking_order(self,time_slot_ids,booking_id,plan_id,booking_date,time_slot_id):
        booking = self.browse(booking_id)
        slots = []
        time_slots = []
        new_date = datetime.strptime(booking_date,'%d/%m/%Y').date()
        weekday = Days[new_date.weekday()]
        for slot in time_slot_ids:
            booking_slot = self.env['booking.slot'].search([('company_id','=',self.env.user.company_id.id),('time_slot_id','=',slot),('plan_id','=',plan_id),('slot_config_id.name','=',weekday)])
            if booking_slot:
                slots.append(booking_slot.id)
                time_slots.append(booking_slot.time_slot_id.id)
        booking.write({
            'booking_slot_ids':[(6,0,slots)],
            'time_slot_ids':[(6,0,time_slots)],
            'booking_date':new_date,
            'time_slot_id':time_slot_id,
            'reschedule_use':booking.reschedule_use + 1
        })
        return {
            'booking_slot_ids':slots,
            'time_slot_ids':time_slots
        }

    @api.model
    def check_for_completion_booking(self):
        res_config = self.env['booking.config'].search([('active_record','=',True),('company_id','=',self.env.user.company_id.id)])
        result = []
        date_book = fields.Datetime().now();
        if request.env.context.get('tz'):
            user_tz = pytz.timezone(request.env.context.get('tz') )
            date_book = pytz.utc.localize(datetime.strptime(date_book.strftime("%Y-%m-%d %H:%M:%S"), '%Y-%m-%d %H:%M:%S')).astimezone(user_tz)
        if res_config:
            reminding_time = res_config.reminder_timing
            bookings = self.env['booking.order'].search([('state','not in',['cancel','done','expired']),('booking_date','=',date_book),('is_notification_sent','=',False),('company_id','=',self.env.user.company_id.id)])
            if len(bookings) > 0:
                for booking in bookings:
                    booking_date = booking.booking_date
                    end_times = []
                    for slot in booking.time_slot_ids:
                        end_times.append(slot.end_time)
                    end_time = max(end_times)
                    _logger.info("***********End time**%r****%r",end_time,end_times)
                    curren_time = datetime.now();
                    if request.env.context.get('tz'):
                        user_tz = pytz.timezone(request.env.context.get('tz') )
                        curren_time = pytz.utc.localize(datetime.strptime(curren_time.strftime("%Y-%m-%d %H:%M:%S"), '%Y-%m-%d %H:%M:%S')).astimezone(user_tz)
                    booking_date_obj = datetime(booking_date.year,booking_date.month,booking_date.day) + timedelta(hours = end_time)
                    _logger.info("**********8te_obj***************%r",reminding_time)
                    _logger.info("*****%r***booking_date_obj******%r",booking_date_obj,datetime.strptime(curren_time.strftime("%Y-%m-%d %H:%M:%S") ,DEFAULT_SERVER_DATETIME_FORMAT)+ timedelta(minutes=int(reminding_time)))
                    if booking_date_obj < datetime.strptime(curren_time.strftime("%Y-%m-%d %H:%M:%S") ,DEFAULT_SERVER_DATETIME_FORMAT)+ timedelta(minutes=int(reminding_time)):
                        result.append({
                            'id':booking.id,
                            'name':booking.name,
                            'booking_time':booking_date_obj.strftime("%Y-%m-%d %H:%M:%S")
                        })
                        booking.is_notification_sent = True
        return result


    def send_mail_on_booking(self):
        location_email_template = self.env.ref("pos_booking_system.wk_booking_email")
        location_email_template.send_mail(self.id, force_send=True)

    def email_to_users(self):
        email_ids = []
        email_ids.append(self.env.user.email)
        if self.customer and self.customer.email:
            email_ids.append(self.customer.email)
        emails = ",".join(email_ids)
        return emails


    @api.model
    def get_active_tables(self,company_id):
        bookings = self.search([('state','=','in_progress'),('company_id','=',company_id)])
        return bookings.read([])


    def click_cancel(self):
        self.state = 'cancel'
        if self.sale_order_id:
            self.sale_order_id.state = 'cancel'

    @api.model
    def update_booking_state(self,data,company_id):
        booking_data = {}
        # if len(data):
        int_list = [int(i) for i in data]
        booking = self.browse(int_list)
        appoint_states = booking.read(['state','end_time','quantity'])
        all_bookings = self.search([('id','not in',int_list),('state','not in',['expired']),('time_slot_id','!=',False),('plan_id','!=',False),('company_id','=',company_id)])
        new_booking = self.env['booking.order']
        for booking in all_bookings:
            if booking.booking_source == 'pos':
                new_booking += booking
            else:
                #if booking.state == 'paid':
                if booking.state != 'draft':
                    new_booking += booking
        new_appoint_data = []
        if len(new_booking) == 1:
            new_appoint_data.extend(new_booking.read(['name','end_time','order_name','plan_price','state','time_slot_id','customer','booking_source','booking_product_id','plan_id','quantity','booking_date']))
        else:
            new_appoint_data.extend(new_booking.read(['name','end_time','state','order_name','plan_price','time_slot_id','booking_source','customer','booking_product_id','plan_id','quantity','booking_date']))
        booking_data.update({
            'booking_states':appoint_states,
            'new_booking_data':new_appoint_data
        })


        return booking_data

    @api.model
    def modify_order_status(self,booking_id,status,order_name):
        booking_id = self.sudo().with_context(force_company=self.env.user.company_id.id).browse(booking_id)
        val = {
            'state':status
        }
        if status == 'in_progress':
            val.update({
                'order_name':order_name
            })
        booking_id.write(val)

    @api.model
    def create_booking_order(self,slots,product_id,booking_date,customer,company_id):
        result = []
        plan_exist = {}
        new_date = datetime.strptime(booking_date,'%d/%m/%Y').date()
        for slot,res in slots.items():
            booking_obj = self.env['booking.order']
            if res.get('plans'):
                for plans,data in res.get('plans').items():
                    new_plan_id = self.env['booking.slot'].browse(data.get('plan_id'))
                    if data and data.get('plan') not in plan_exist.keys():
                        name = False
                        if company_id:
                            name = self.env['ir.sequence'].with_context(force_company=company_id).next_by_code('booking.sale.order') or _('BOOK')
                        else:
                            name = self.env['ir.sequence'].next_by_code('booking.sale.order') or _('BOOK')
                        name = ''.join(random.choices(string.digits + string.ascii_uppercase , k = 7))
                        all_plans = [plan.get('plan_id') for slot,plan in res.get('plans').items()]
                        all_slots = self.env['booking.slot'].browse(all_plans)
                        time_slots = {plan.time_slot_id.start_time:plan.time_slot_id.id for plan in all_slots}
                        min_time = min(time_slots.keys())

                        booking_obj = self.create({
                            'name':name,
                            'booking_slot_ids':[(4,new_plan_id.id)],
                            'time_slot_ids':[(4,new_plan_id.time_slot_id.id)],
                            'time_slot_id':time_slots[min_time],
                            'plan_id':data.get('plan'),
                            'plan_price':new_plan_id.price,
                            'customer':customer,
                            'booking_source':'pos',
                            'reschedule_use':0,
                            'booking_date':new_date,
                            'booking_product_id':product_id,
                            'quantity':1
                        })
                        plan_exist[data.get('plan')] = [data.get('plan'),booking_obj]
                        config = self.env['booking.config'].search([('active_record','=',True),('company_id','=',self.env.user.company_id.id)],limit=1)
                        if config and config.is_send_mail:
                            booking_obj.send_mail_on_booking()
                    else:
                        plan_exist[data.get('plan')][1].write({
                            'booking_slot_ids':[(4,data.get('plan_id'))],
                            'time_slot_ids':[(4,new_plan_id.time_slot_id.id)],
                            'quantity':plan_exist[data.get('plan')][1].quantity+1
                        })
                booking_order = booking_obj.read(['name','order_name','end_time','reschedule_use','time_slot_ids','booking_source','plan_price','state','time_slot_id','customer','booking_product_id','plan_id','quantity','booking_date'])
                _logger.info("*****booking sorder****:%r",booking_order)
                end_time = False
                if booking_obj.time_slot_ids and len(booking_obj.time_slot_ids) > 1:
                    all_end_times = [i.end_time for i in booking_obj.time_slot_ids]
                    end_time = max(all_end_times)
                if booking_order and booking_order[0]:
                    booking_data = booking_order[0]
                    temp = {}
                    temp.update( {
                        "name":booking_data.get("name"),
                        'state':booking_data.get("state"),
                        'booking_source':booking_data.get('booking_source'),
                        'booking_product_id':booking_data.get("booking_product_id"),
                        'customer':booking_data.get("customer"),
                        'time_slot_id':booking_data.get("time_slot_id"),
                        'time_slot_ids':booking_data.get("time_slot_ids"),
                        'reschedule_use':0,
                        'end_time':end_time,
                        'plan_price':booking_data.get('plan_price'),
                        'plan_id':booking_data.get("plan_id"),
                        'quantity':booking_data.get("quantity"),
                        'id':booking_data.get("id"),
                        'booking_date':booking_data.get('booking_date'),
                    })
                    result.append(temp)
        return result

    @api.model
    def create_from_ui(self,order_name,lines):
        order = self.search([('order_name','=',order_name)])
        _logger.info("***********namel iens**********%r",lines)
        if order:
            order.extra_lines_ids.unlink()
            # data = {
            #     ''
            # }
            # lines = map(lines,lambda x: del x['price_subtotal']
            _logger.info("***********namel iens**********%r",lines)
            order.write({'extra_lines_ids':lines,'order_name':order_name})

    @api.model
    def get_additional_lines(self,booking_id,order_name):
        bookings = self.browse(booking_id)
        bookings.order_name = order_name
        lines = bookings.extra_lines_ids
        data_to_send = [{'qty':line.qty,'product_id':line.product_id.id,'price_unit':line.price_unit} for line in lines]
        return {'lines':data_to_send}


    @api.returns('self', lambda value: value.id)
    def copy(self, default=None):
        self.ensure_one()
        # Cleaning archived contact_list_ids
        default = dict(default or {},
                       name=_('%s') %(''.join(random.choices(string.digits + string.ascii_uppercase , k = 7))),)
        res = super(BookingOrder, self).copy(default=default)

        return res


class BookingOrderLine(models.Model):
    _name = 'booking.order.line'

    product_id = fields.Many2one('product.product',string="Product")
    qty = fields.Integer(string="Quantity")
    price_subtotal_incl = fields.Float(string="Price Subtotal")
    price_unit = fields.Float(string="Unit Price")
    related_order = fields.Many2one(string="Related Order")



class PosOrder(models.Model):
    _inherit = 'pos.order'

    booking_id = fields.Many2one('booking.order',string="Booking Order")



    @api.model
    def get_booking_reservation_data(self,product_id):
        if not product_id:
            return False
        product_obj = self.env["product.template"].browse(product_id)
        values = {
            'booking_status' : False
        }
        current_date = self.get_default_date(product_id)
        if current_date:
            week_days = self.get_all_week_days(current_date, product_obj)
            current_day = Days[current_date.weekday()]
            end_date = self.get_end_date(current_date)
            current_day_slots = product_obj.get_booking_slot_for_day(current_date)
            w_closed_days = product_obj.get_bk_open_closed_days("closed")
            br_end_date = product_obj.br_end_date
            br_start_date = product_obj.br_start_date
            values.update({
                'booking_status' : True,
                'product' : product_obj,
                'week_days' : week_days,
                'w_closed_days' : json.dumps(w_closed_days),
                'current_day' : current_day,
                'current_date' : current_date,
                'day_slots' : current_day_slots,
                'end_date' : end_date,
                'default_date' : current_date,
                'br_end_date' : br_end_date,
                'br_start_date' : br_start_date
            })
        return values

    def get_end_date(self,current_date):
        booking_config = self.env['booking.config'].search([('active_record','=',True),('company_id','=',self.env.user.company_id.id)])
        end_date = current_date + timedelta(days=1)
        if len(booking_config) == 0:
            return end_date
        if booking_config.type_of_booking_range == 'days':
            end_date = current_date + timedelta(days=booking_config.booking_range)
        elif booking_config.type_of_booking_range == 'months':
            end_date = current_date + relativedelta(months=booking_config.booking_range)
        else:
            end_date = current_date + relativedelta(years=booking_config.booking_range)
        return end_date




    def get_all_week_days(self, sel_date, product_obj):
        """Return all week day,date list for the selected date"""
        bk_open_days = product_obj.get_bk_open_closed_days("open")
        if not bk_open_days:
            return False
        week_days = [None]*7
        current_date = self.get_default_date(product_obj.id)
        end_date = self.get_end_date(current_date)
        day = sel_date.weekday()
        v_date = sel_date - timedelta(days=day)
        for w_day in week_days:
            day = v_date.weekday()
            week_days[day] = {
                "day" : Days[day],
                "date_str" : datetime.strftime(v_date,'%d %b %Y'),
                "date" : datetime.strftime(v_date,'%m/%d/%Y'),
                "state" : "active" if current_date <= v_date and v_date <= end_date and Days[day] in bk_open_days else "inactive",
            }
            v_date = v_date + timedelta(days=1)
        return week_days

    # Update slots on week day selection
    def booking_reservation_update_slots(self,**post):
        w_day = post.get('w_day',False)
        w_date = post.get('w_date',False)
        w_date = datetime.strptime(w_date,'%m/%d/%Y').date()
        product_id = post.get('product_id',False)
        if not product_id:
            return False
        product_obj = self.env["product.template"].browse(product_id)
        current_day_slots = product_obj.get_booking_slot_for_day(w_date)
        values = {
            'day_slots' : current_day_slots,
            'current_date' : w_date,
            'product' : product_obj,
        }
        return values

    # Update plans on slot selection
    @api.model
    def booking_reservation_slot_plans(self,time_slot_id,slot_plans,sel_date,product_id):
        product_obj = self.env["product.template"].browse(product_id);
        slot_plans = ast.literal_eval(slot_plans)
        values = {
            'd_plans' : slot_plans,
            'current_date' : sel_date,
            'product' : product_obj,
        }
        return values

    def get_default_date(self, product_id):
        product_obj = self.env["product.template"].browse(product_id);
        w_open_days = product_obj.get_bk_open_closed_days("open")
        if not w_open_days:
            return False
        current_date = date.today()
        start_date = current_date
        end_date = self.get_end_date(current_date)
        if end_date < current_date:
            return False
        elif current_date < start_date:
            current_date = start_date
        current_day = Days[current_date.weekday()]
        if current_day in w_open_days:
            return current_date
        while(current_day not in w_open_days):
            current_date = current_date + timedelta(days=1)
            current_day = Days[current_date.weekday()]
            if end_date < current_date:
                return False
        return current_date


    # Update booking modal on date selection
    @api.model
    def update_booking_slots(self,product_id,new_date):
        if not product_id:
            return False
        product_obj = self.env["product.template"].browse(product_id);
        new_date = datetime.strptime(new_date,'%d/%m/%Y').date()
        end_date = self.get_end_date(new_date)

        week_days = self.get_all_week_days(new_date, product_obj)
        current_day = Days[new_date.weekday()]
        current_day_slots = product_obj.get_booking_slot_for_day(new_date)
        values = {
            'product' : product_obj,
            'week_days' : week_days if week_days else [],
            'current_day' : current_day,
            'current_date' : new_date,
            'day_slots' : current_day_slots,
            'end_date' : end_date,
        }
        return values



    # Update booking modal on date selection
    @api.model
    def update_time_slots(self,product_id,new_date,booking_id):
        if not product_id:
            return False
        booking = self.env['booking.order'].browse(booking_id)
        product_obj = self.env["product.template"].browse(product_id);
        new_date = datetime.strptime(new_date,'%d/%m/%Y').date()
        end_date = self.get_end_date(new_date)
        new_slots = []

        week_days = self.get_all_week_days(new_date, product_obj)
        current_day = Days[new_date.weekday()]
        current_day_slots = product_obj.get_booking_slot_for_day(new_date)

        booking_plan = self.env['booking.order'].browse(booking_id);
        for slot in current_day_slots:
            is_plan_available = False
            for plan in slot.get('plans'):
                if plan.get('plan_id') == booking_plan.plan_id.id:
                    is_plan_available = True
            if is_plan_available:
                new_slots.append(slot)
        values = {
            'day_slots' : new_slots,
        }
        return values


    @api.model
    def get_available_slots_for_extension(self,product_id,date,existing_slots,booking_id):
        if not product_id:
            return False
        product_obj = self.env["product.template"].browse(int(product_id));
        new_date = datetime.strptime(date,'%d/%m/%Y').date()
        current_day_slots = product_obj.get_booking_slot_for_day(new_date)
        new_slots = []
        booking_plan = self.env['booking.order'].browse(booking_id);
        for slot in current_day_slots:
            is_plan_available = False
            for plan in slot.get('plans'):
                if plan.get('plan_id') == booking_plan.plan_id.id:
                    is_plan_available = True
            if slot.get('slot').get('id') not in existing_slots and is_plan_available:
                new_slots.append(slot)
        return new_slots



    @api.model
    def _order_fields(self,ui_order):
        fields_return = super(PosOrder,self)._order_fields(ui_order)
        fields_return.update({'booking_id':ui_order.get('booking_id',False)})
        return fields_return


    @api.model
    def create_from_ui(self, orders,draft = False):
        order_ids = return_data = super(PosOrder,self).create_from_ui(orders,draft)
        if type(order_ids) == dict:
            order_objs = self.env['pos.order'].browse(order_ids.get('order_ids'))
            result = return_data or {}
        else:
            order_objs = self.env['pos.order'].browse([i.get('id') for i in order_ids])
        for order_obj in order_objs:
            _logger.info("********order obj********%r,order",order_obj)
            if(order_obj.booking_id):
                order_obj.booking_id.write({'state':'done','checkout':datetime.now(),'pos_order_id':order_obj.id})
        return order_ids




class ProductCategory(models.Model):
    _inherit = 'product.category'

    @api.model
    def create(self,vals):
        res = super(ProductCategory, self).create(vals)
        user = self.env.user
        if user.has_group('pos_booking_system.group_pos_booking_system_super_user'):
            return res
        raise Warning("You Cannot Create/Write a Product Category. Contact User With SuperUser Access.")


    def write(self,vals):
        res = super(ProductCategory, self).write(vals)
        user = self.env.user
        if user.has_group('pos_booking_system.group_pos_booking_system_super_user'):
            if self.env.user.company_id and len(self.env.user.company_id.parent_id) == 0:
                return res
            else:
                raise Warning("Only user of parent company can Create/Write Product Category.")
        raise Warning("You Cannot Create/Write a Product Category. Contact User With SuperUser Access.")

class ResUsers(models.Model):
    _inherit = "res.users"

    is_superuser = fields.Boolean(string="Is SuperUser",compute="compute_is_superuser")


    def write(self,vals):
        user = self.env.user
        if not user.has_group('base.group_system'):
            groups = self.env['res.groups'].search([('category_id.name','=','Administration')]).ids
            superuser = self.env['res.groups'].search([('category_id.name','=','Extra Rights'),('name','=','SuperUser')]).ids
            group = ''
            superuser_str = ''
            if len(groups):
                sorted(groups)
                group = 'sel_groups_' + '_'.join(str(it) for it in groups)
            if len(superuser):
                sorted(superuser)
                superuser_str = 'in_group_' + '_'.join(str(it) for it in superuser)
            # if vals and (group in vals.keys() or superuser_str in vals.keys()):
            #     raise Warning("Only user of parent company can Create/Write User Settings.")
            # if vals:
            #     if superuser_str in vals.keys():
            #         raise Warning("Only user of parent company can Create/Write User Settings.")
            #     if group in vals.keys():
            #         a_id = vals[group]
            #         new_group = self.env['res.groups'].browse(a_id)
            #         if new_group and new_group.name == 'Settings':
            #             raise Warning("Only user of parent company can Create/Write User Settings.")
            # else:
            #     return res
            if vals:
                if superuser_str in vals.keys() and vals[superuser_str]:
                    raise Warning("Only user of parent company can Create/Write User Settings.")
                if group in vals.keys():
                    a_id = vals[group]
                    new_group = self.env['res.groups'].browse(a_id)
                    if new_group and new_group.name == 'Settings':
                        raise Warning("Only user of parent company can Create/Write User Settings.")
        res = super(ResUsers, self).write(vals)
        return res

    @api.model
    def create(self,vals):
        user = self.env.user
        if not user.has_group('base.group_system'):
            groups = self.env['res.groups'].search([('category_id.name','=','Administration')]).ids
            superuser = self.env['res.groups'].search([('category_id.name','=','Extra Rights'),('name','=','SuperUser')]).ids
            group = ''
            superuser_str = ''
            if len(groups):
                sorted(groups)
                group = 'sel_groups_' + '_'.join(str(it) for it in groups)
            if len(superuser):
                sorted(superuser)
                superuser_str = 'in_group_' + '_'.join(str(it) for it in superuser)
            # if vals and (group in vals.keys() or superuser_str in vals.keys()):
            #     raise Warning("Only user of parent company can Create/Write User Settings.")
            # if vals:
            #     if superuser_str in vals.keys():
            #         raise Warning("Only user of parent company can Create/Write User Settings.")
            #     if group in vals.keys():
            #         a_id = vals[group]
            #         new_group = self.env['res.groups'].browse(a_id)
            #         if new_group and new_group.name == 'Settings':
            #             raise Warning("Only user of parent company can Create/Write User Settings.")
            if vals:
                if superuser_str in vals.keys() and vals[superuser_str]:
                    raise Warning("Only user of parent company can Create/Write User Settings.")
                if group in vals.keys():
                    a_id = vals[group]
                    new_group = self.env['res.groups'].browse(a_id)
                    if new_group and new_group.name == 'Settings':
                        raise Warning("Only user of parent company can Create/Write User Settings.")
            # else:
            #     return res
        res = super(ResUsers, self).create(vals)
        return res


    def compute_is_superuser(self):
        for obj in self:
            if obj.has_group('pos_booking_system.group_pos_booking_system_super_user'):
                # obj.is_superuser = True
                _logger.info("********Wroking")

    #
    # #
    @api.model
    @api.returns('self',
        upgrade=lambda self, value, args, offset=0, limit=None, order=None, count=False: value if count else self.browse(value),
        downgrade=lambda self, value, args, offset=0, limit=None, order=None, count=False: value if count else value.ids)
    def search(self, args, offset=0, limit=None, order=None, count=False):
        temp_args = args.copy()
        for arg in args:
            if 'my_users' in arg:
                args.remove(arg)
        all_users = super(ResUsers, self).search(args, offset=0, limit=None, order=None, count=False)
        users_to_show = self.env['res.users']
        if all_users:
            for domain in temp_args:
                if domain and len(domain) == 3 and domain[2] and domain[2] == 'my_users':
                    if self.env.user.has_group('pos_booking_system.group_pos_booking_system_super_user'):
                        users_to_show = all_users
                    else:
                        users_to_show = all_users.filtered(lambda l:l.has_group('pos_booking_system.group_pos_booking_system_super_user') == False)
        if users_to_show:
            return users_to_show
        else:
            return all_users

    # @api.model
    # @api.returns('self',
    #     upgrade=lambda self, value, args, offset=0, limit=None, order=None, count=False: value if count else self.browse(value),
    #     downgrade=lambda self, value, args, offset=0, limit=None, order=None, count=False: value if count else value.ids)
    # def search(self, args, offset=0, limit=None, order=None, count=False):
    #     new_domain = []
    #     for domain in args:
    #         if domain[2] == 'my_company':
    #             new_domain += [('id', '=',self.env.user.company_id.id)]
    #         else:
    #             new_domain += [domain]
    #     return super(ResCompany, self).search(new_domain, offset=0, limit=None, order=None, count=False)
    #


    # @api.model
    # def search_read(self, domain=None, fields=None, offset=0, limit=None, order=None):
    #     _logger.info("*********search_Read running***********")
    #     res = super(ResUsers, self).search_read(domain=domain, fields=fields, offset=offset, limit=limit, order=order)
    #     return res



    def fitler_users(self):
        all_users = self.search([('company_id','=',self.env.user.company_id.id)])
        users_to_show = self.env['res.users']
        if all_users:
            if self.env.user.has_group('pos_booking_system.group_pos_booking_system_super_user'):
                users_to_show = all_users
            else:
                users_to_show = all_users.filtered(lambda l:l.has_group('pos_booking_system.group_pos_booking_system_super_user') == False)

        return {
                'name': _("Users"),
                'type': 'ir.actions.act_window',
                'res_model': 'res.users',
                'view_mode': 'tree,kanban,form',
                'view_type': 'form',
                'search_view_id':self.env.ref('base.view_users_search').id,
                'domain':[('id','in',users_to_show.ids)],
                'context': {'search_default_no_share': 1},
                'help': 'Create and manage users that will connect to the system. Users can be deactivated should there be a period of time during which they will/should not connect to the system. You can assign them groups in order to give them specific access to the applications they need to use in the system.',
            }


# class ProductProduct(models.Model):
#     _inherit = "product.product"
#
#     related_company = fields.Many2one('res.company')


class ProductTemplate(models.Model):
    _inherit = "product.template"

    range_price = fields.Char(compute="_compute_range_price",string="Range Price")
    # is_superuser = fields.Boolean(string="Is SuperUser",compute="compute_is_superuser")


    # @api.model
    # def create(self,vals):
    #     if vals.get('facility') and vals.get('facility')[0] and vals.get('facility')[0][2]:
    #         if not (self.env.user.has_group("base.group_erp_manager") or self.env.user.has_group("base.group_system")):
    #             raise ValidationError("Only SuperUser can Create/Edit the facilties.")
    #     res = super(ResCompany,self).create(vals)
    #     return res


    # def write(self,vals):
    #     if vals.get('facility') and vals.get('facility')[0] and vals.get('facility')[0][2]:
    #         # if not self.env.user.has_group("pos_booking_system.group_pos_booking_system_super_user"):
    #         if not (self.env.user.has_group("base.group_erp_manager") or self.env.user.has_group("base.group_system")):
    #             raise ValidationError("Only SuperUser can Create/Edit the facilties.")
    #     res = super(ProductTemplate,self).write(vals)
    #     return res

    def compute_is_superuser(self):
        for obj in self:
            _logger.info("**********boj***%r*****%r",obj,isinstance(obj.id,int))
            if obj and obj.id and isinstance(obj.id,int) and self.env.user.has_group('pos_booking_system.group_pos_booking_system_super_user'):
                _logger.info("goingin*******")
                # obj.is_superuser = True



    @api.depends('booking_day_slot_ids')
    def _compute_range_price(self):
        for obj in self:
            if obj.booking_day_slot_ids:
                range_price_start = self.env["booking.slot"].search([('slot_config_id.product_id','=',obj.id)],order="price desc")
                if range_price_start and range_price_start[-1] and range_price_start[0]:
                    obj.range_price = str(range_price_start[-1].price) + ' - ' + str(range_price_start[0].price)
                else:
                    obj.range_price = 'No Slots'
            else:
                obj.range_price = 'No Day Slots'

    def generate_dayslots(self):
        week_days = self.env['week.day'].search([('code','in',['sun','mon','tue','wed','thu','fri','sat'])])
        week_days_list = [day.code for day in week_days]
        if len(week_days) != 7:
            for day in ['sun','mon','tue','wed','thu','fri','sat']:
                if day not in week_days_list:
                    self.env['week.day'].create({'code':day,'name':WeekDays[day]})
        return {
            'type': 'ir.actions.act_window',
            'view_mode': 'form',
            'res_model': 'auto.day.slot.wizard',
            'views': [(False, 'form')],
            'view_id': False,
            'name':'Generate Day Slots',
            'target': 'new',
            'context':{'company_id':self.env.user.company_id.id}
        }

class CompanyFacility(models.Model):
    _name = 'company.facility'

    name = fields.Char(string="Name")

class ResCompany(models.Model):
    _inherit = "res.company"

    description = fields.Text(string="Description")
    operational_hours_start_time = fields.Float(string="Start Time")
    operational_hours_end_time = fields.Float(string="End Time")
    facility_ids = fields.Many2many('company.facility',string="Facility")


    @api.model
    @api.returns('self',
        upgrade=lambda self, value, args, offset=0, limit=None, order=None, count=False: value if count else self.browse(value),
        downgrade=lambda self, value, args, offset=0, limit=None, order=None, count=False: value if count else value.ids)
    def search(self, args, offset=0, limit=None, order=None, count=False):
        new_domain = []
        for domain in args:
            if domain[2] == 'my_company':
                new_domain += [('id', '=',self.env.user.company_id.id)]
            else:
                new_domain += [domain]
        return super(ResCompany, self).search(new_domain, offset=0, limit=None, order=None, count=False)

    @api.model
    def create(self,vals):
        # if vals.get('facility') and vals.get('facility')[0] and vals.get('facility')[0][2]:
        #     if not (self.env.user.has_group("base.group_erp_manager") or self.env.user.has_group("base.group_system")):
        #         raise ValidationError("Only SuperUser can Create/Edit the facilties.")
        # res = super(ResCompany,self).create(vals)
        # return res
        if not self.env.user.has_group("pos_booking_system.group_pos_booking_system_super_user"):
            raise ValidationError("Only SuperUser can create a company.")
        else:
            res = super(ResCompany,self).create(vals)
            return res


    def write(self,vals):
        if vals.get('facility') and vals.get('facility')[0] and vals.get('facility')[0][2]:
            # if not self.env.user.has_group("pos_booking_system.group_pos_booking_system_super_user"):
            if not (self.env.user.has_group("base.group_erp_manager") or self.env.user.has_group("base.group_system")):
                raise ValidationError("Only SuperUser can Create/Edit the facilties.")
        res = super(ResCompany,self).write(vals)
        return res
    #
    # @api.model
    # @api.returns('self',
    #     upgrade=lambda self, value, args, offset=0, limit=None, order=None, count=False: value if count else self.browse(value),
    #     downgrade=lambda self, value, args, offset=0, limit=None, order=None, count=False: value if count else value.ids)
    # def search(self, args, offset=0, limit=None, order=None, count=False):
    #     new_domain = []
    #     for domain in args:
    #         if domain[2] == 'my_company':
    #             new_domain += [('id', '=',self.env.user.company_id.id)]
    #         else:
    #             new_domain += [domain]
    #     return super(ResCompany, self).search(new_domain, offset=0, limit=None, order=None, count=False)


class DaySlotConfig(models.Model):
    _inherit = 'day.slot.config'

    company_id = fields.Many2one('res.company', string='Company', required=True, readonly=True, default=lambda self: self.env.user.company_id)



class BookingPlan(models.Model):
    _inherit = 'booking.plan'

    company_id = fields.Many2one('res.company', string='Company', required=True, readonly=True, default=lambda self: self.env.user.company_id)

class BookingTimeSlot(models.Model):
    _inherit = 'booking.time.slot'

    company_id = fields.Many2one('res.company', string='Company', required=True, readonly=True, default=lambda self: self.env.user.company_id)

    # SQL Constraints
    _sql_constraints = [
        ('booking_time_slot_uniq', 'unique(start_time, end_time,company_id)', _('This time slot is already exist.'))
    ]


    def generate_timeslots(self):
        return {
            'type': 'ir.actions.act_window',
            'name':'Generate Time Slots',
            'view_mode': 'form',
            'res_model': 'auto.time.slot.wizard',
            'views': [(False, 'form')],
            'view_id': False,
            'target': 'new',
        }
