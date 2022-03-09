from odoo import api, fields, models, _
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
from datetime import date, timedelta, datetime
import pytz
import random
import string
import logging
_logger = logging.getLogger(__name__)


class BookingOrder(models.Model):
    _inherit = 'booking.order'

    table_id = fields.Many2one('restaurant.table', string='Table', help='The table where this order was served',
                               index=True)
    @api.model
    def is_show_timer(self, booking_id):
        booking = self.browse(booking_id)
        if booking.state in ('done', 'exprired', 'cancel'):
            return False
        user_tz = pytz.timezone(self.env.user.tz and self.env.user.tz or self._context.get('tz') or 'UTC')
        current_time = pytz.utc.localize(fields.Datetime.now()).astimezone(user_tz)
        current_time = datetime.strptime(current_time.strftime("%Y-%m-%d %H:%M:%S"),
                                         DEFAULT_SERVER_DATETIME_FORMAT)

        booking_date = datetime.combine(booking.booking_date, datetime.min.time())
        start_time = min(booking.booking_slot_ids.mapped('time_slot_id').mapped('start_time'))
        end_time = max(booking.booking_slot_ids.mapped('time_slot_id').mapped('end_time'))
        booking_start_time = booking_date + timedelta(hours=start_time)
        booking_end_time = booking_date + timedelta(hours=end_time)
        if booking_start_time <= current_time and booking_end_time >= current_time:
            return True
        else:
            return False



    @api.model
    def booking_expiry_check_scheduler(self):
        bookings = self.search([('state', 'not in', ['cancel', 'done', 'expired'])])
        for booking in bookings:
            _logger.info("********888booking.booking_slot_ids******%r", booking.booking_slot_ids)
            booking_date = datetime.combine(booking.booking_date, datetime.min.time())
            start_time = min(booking.booking_slot_ids.mapped('time_slot_id').mapped('start_time'))
            end_time = max(booking.booking_slot_ids.mapped('time_slot_id').mapped('end_time'))
            booking_start_time = booking_date + timedelta(hours=start_time)
            booking_end_time = booking_date + timedelta(hours=end_time)
            current_time = datetime.strptime(fields.Datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                 DEFAULT_SERVER_DATETIME_FORMAT)
            user_tz = pytz.timezone(self.env.user.tz and self.env.user.tz or self._context.get('tz') or 'UTC')
            current_time = pytz.utc.localize(current_time).astimezone(user_tz)
            current_time = datetime.strptime(current_time.strftime("%Y-%m-%d %H:%M:%S"),
                                             DEFAULT_SERVER_DATETIME_FORMAT)
            booking_end_time = datetime.strptime(
                    booking_end_time.strftime("%Y-%m-%d %H:%M:%S"), DEFAULT_SERVER_DATETIME_FORMAT)
            if current_time >= booking_start_time and booking.state != 'in_progress':
                booking.state = 'in_progress'
            if current_time >= booking_end_time:
                booking.state = 'expired'

    @api.model
    def create_booking_order(self, slots, product_id, booking_date, customer, company_id, table_id=False):
        result = super(BookingOrder, self).create_booking_order(slots, product_id, booking_date, customer, company_id)
        table = self.env['restaurant.table'].browse(table_id)
        if table and result :
            self.env['booking.order'].browse(result[0]['id']).table_id = table
        return result