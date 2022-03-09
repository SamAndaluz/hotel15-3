# -*- coding: utf-8 -*-
#################################################################################
#
#   Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>)
#   See LICENSE file for full copyright and licensing details.
#   License URL : <https://store.webkul.com/license.html/>
#
#################################################################################

from odoo import api, models, fields, _,exceptions
import logging
_logger = logging.getLogger(__name__)


class AutoTimeSlotWizard(models.TransientModel):
    _name = "auto.time.slot.wizard"
    _description = "Auto Generated Time Slots"

    start_time = fields.Integer(string="Intial Time")
    end_time = fields.Integer(string="End Time")
    time_duration = fields.Integer(string="Time Duration")

    # def create_timeslots(self):
    #     if self.start_time < 0:
    #         raise exceptions.ValidationError("The Start Time must be greater or equals to 0.")
    #     if self.end_time < 0:
    #         raise exceptions.ValidationError("The End Time must be greater or equals to 0.")
    #     if self.time_duration <= 0:
    #         raise exceptions.ValidationError("The Time Duration must be greater than 0.")
    #     new_end_time = self.end_time
    #     # if self.end_time == 24 and self.start_time == 0:
    #     #     if self.time_duration == 2:
    #     #         new_end_time = 22
    #     #     if self.time_duration == 1:
    #     #         new_end_time = 23
    #     #     if self.time_duration == 4:
    #     #         new_end_time = 20
    #     #     if self.time_duration == 6:
    #     #         new_end_time = 18
    #     if new_end_time == 0:
    #         new_end_time -= self.time_duration
    #     for time in range(self.start_time,new_end_time,self.time_duration):
    #         end_time = time + self.time_duration if self.end_time >= time + self.time_duration else new_end_time
    #         # slot = self.env['booking.time.slot'].search(['|',('start_time','=',time),('end_time','=',end_time),'|',('start_time','<',time),('end_time','>',time)])
    #         slot = self.env['booking.time.slot'].search([('start_time','=',time),('end_time','=',end_time)])
    #         if not slot:
    #             self.env['booking.time.slot'].create({
    #                     'start_time':time,
    #                     'end_time':end_time
    #             })
    #     if (self.end_time == 24 and self.start_time == 0) or self.end_time == 0:
    #         t_slot = self.env['booking.time.slot'].search([('start_time','=',new_end_time),('end_time','=',0)])
    #         if not t_slot:
    #             self.env['booking.time.slot'].create({
    #                     'start_time':new_end_time,
    #                     'end_time':0
    #             })
    #     return True


    def create_timeslots(self):
        if self.start_time < 0:
            raise exceptions.ValidationError("The Start Time must be greater or equals to 0.")
        if self.end_time < 0:
            raise exceptions.ValidationError("The End Time must be greater or equals to 0.")
        if self.time_duration <= 0:
            raise exceptions.ValidationError("The Time Duration must be greater than 0.")
        new_end_time = self.end_time
        if (self.end_time == 24 and self.start_time == 0) or (self.end_time == 0 and self.start_time == 24):
            self.end_time = 24
            self.start_time = 0
            if self.time_duration == 2:
                new_end_time = 22
            if self.time_duration == 1:
                new_end_time = 23
            if self.time_duration == 4:
                new_end_time = 20
            if self.time_duration == 6:
                new_end_time = 18
        if new_end_time == 0:
            new_end_time = 24 - self.time_duration
        _logger.info("********new_end time*****%r",new_end_time)
        for time in range(self.start_time,new_end_time,self.time_duration):
            end_time = time + self.time_duration if self.end_time >= time + self.time_duration else new_end_time
            _logger.info("********create end time*****%r",end_time)
            # slot = self.env['booking.time.slot'].search(['|',('start_time','=',time),('end_time','=',end_time),'|',('start_time','<',time),('end_time','>',time)])
            slot = self.env['booking.time.slot'].search([('start_time','=',time),('end_time','=',end_time)])
            if not slot:
                self.env['booking.time.slot'].create({
                        'start_time':time,
                        'end_time':end_time
                })
        if (self.end_time == 24 and self.start_time == 0) or self.end_time == 0:
            t_slot = self.env['booking.time.slot'].search([('start_time','=',new_end_time),('end_time','=',0)])
            if not t_slot:
                self.env['booking.time.slot'].create({
                        'start_time':new_end_time,
                        'end_time':0
                })
        return True




class WeekDay(models.Model):
    _name = "week.day"
    _description = "Week Days"

    name = fields.Char()
    code = fields.Char()

class AutoDaySlotWizard(models.TransientModel):
    _name = "auto.day.slot.wizard"
    _description = "Auto Generated Time Slots"

    input_days = fields.Many2many('week.day','auto_gen_wizard_rel','id','name',string="Input Days")
    booking_plan = fields.Many2many('booking.plan','auto_gen_booking_plan_rel','id','name',string="Booking Plan")
    time_slot = fields.Many2many('booking.time.slot','auto_gen_time_slot_rel','id','name',string="Time Slot")
    # is_exclusive = fields.Boolean(string="Is Exclusive")
    price = fields.Float(string="Price")



    def create_dayslots(self):
        product_id = self.env.context.get('active_id')
        if len(self.input_days) == 0:
            raise exceptions.ValidationError("Please select atleast an input day.")
        if len(self.booking_plan) <= 0:
            raise exceptions.ValidationError("Please select atleast a booking plan.")
        if len(self.time_slot) <= 0:
            raise exceptions.ValidationError("Please select atleast a time slot.")
        for day in self.input_days:
            day_slot = self.env['day.slot.config']
            day_slot = self.env['day.slot.config'].search([('name','=',day.code),('product_id','=',product_id)])
            if not day_slot:
                day_slot = self.env['day.slot.config'].create({
                    'name':day.code,
                    'product_id':product_id
                })
            for slot in self.time_slot:
                for plan in self.booking_plan:
                    booking_slot = self.env['booking.slot'].search([('time_slot_id','=',slot.id),('plan_id','=',plan.id),('slot_config_id','=',day_slot.id)])
                    if booking_slot:
                        booking_slot.price = self.price
                    else:
                        _logger.info("day_slot.booking_slots_ids********:%r",day_slot.booking_slots_ids)
                        # if day_slot.booking_slots_ids:
                        saved_data = self.env["booking.slot"].browse(day_slot.booking_slots_ids.ids);
                        # new_data = day_slot.booking_slots_ids - saved_data
                        _logger.info("new_data******:%r",saved_data)
                        # for rec in saved_data:
                            # if rec.time_slot_id and rec.plan_id:
                        # x = saved_data.filtered(lambda l: l.time_slot_id == slot.id and l.plan_id == plan)
                        # _logger.info("****x*******:%r",x)
                        # if len(x) > 0:
                        #     raise UserError(_("Slot already exist with start time("+str(slot.start_time)+")  with same plan("+plan.name+")."))
                        for l in saved_data:
                            if l.plan_id == plan:
                                _logger.info("*%r**********datattttttttttttt**%r**:%r",l.time_slot_id.start_time,slot.start_time,l.time_slot_id.end_time)
                        y = saved_data.filtered(lambda l: l.time_slot_id.end_time > slot.start_time and l.time_slot_id.start_time <= slot.start_time and l.plan_id == plan)
                        _logger.info("****y*******:%r",y)
                        if len(y) > 0:
                            # raise UserError(_("Slot start with("+str(slot.start_time)+") and plan("+plan.name+") is overlapping other slots by time."))
                            continue

                        booking_slot = self.env['booking.slot'].create({'time_slot_id':slot.id,'plan_id':plan.id,'price':self.price,'slot_config_id':day_slot.id})
