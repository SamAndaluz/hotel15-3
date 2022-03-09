from odoo import models, fields


class BookingConfig(models.Model):
    _inherit = 'booking.config'

    booked_color = fields.Char(default="#35D374")
    not_booked_color = fields.Char(default="#ACADAD")
    expiring_color = fields.Char(default="#EBBF6D")
    expire_reminder = fields.Integer(default=30, help="Change color of Room when given minutes left to finish the booking.")
