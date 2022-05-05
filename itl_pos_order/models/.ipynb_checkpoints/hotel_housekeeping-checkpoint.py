# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError
from datetime import timedelta

from odoo.addons import decimal_precision as dp
import logging

_logger = logging.getLogger(__name__)


class HotelHousekeeping(models.Model):
    _inherit = 'hotel.housekeeping'

    @api.model
    def create_new_activity(self, room_id):

        clean_start_date = act_date = fields.Datetime.now()
        
        values = {
            'clean_type': 'checkout',
            'inspect_date_time': act_date,
            'inspector_id': 1,
            'room_id': room_id,
        }
        
        hk_ids = self.create(values)
        _logger.info("HK: {}".format(hk_ids))
        
        ### Get Default Duration time for Activity
        time_activity = self.env['hotel.activity'].search([('is_default_for_clean_type', '=', hk_ids.clean_type)])[0].activity_duration 

        ## Calculate cleanning period time
        clean_end_date = clean_start_date + timedelta(minutes=time_activity)
        _logger.info("Clean Start: {} / Clean End: {}".format(clean_start_date, clean_end_date))
        
        ## Prepare Housekeeping Activity Lines
        act_lines = {
            'housekeeping_id': hk_ids.id,
            'activity_id': 1,## Fixed 1 but should search for a default activity when Checkout
            'clean_start_time': clean_start_date,
            'clean_end_time': clean_end_date,
            'housekeeper_id': 6,  ### Fixed to HK1, Change to get a list of hk and choose one
            'today_date': act_date,     
        }
        _logger.info("Act Lines: {}".format(act_lines))
        self.env['hotel.housekeeping.activities'].create(act_lines)
        
        return True
        

class RestaurantTable(models.Model):
    _inherit = 'restaurant.table'
    
    room_id = fields.Many2one(string='Room', comodel_name='hotel.room')
    
    
class HotelActivity(models.Model):
    _inherit = 'hotel.activity'
    
    activity_duration = fields.Integer(string='Activity Duration', default=30)
    is_default_for_clean_type = fields.Selection(selection=[
        ('daily', 'Daily'),
        ('checkin', 'Checkin'),
        ('checkout', 'Checkout'),], string='Is the default for Clean Type')