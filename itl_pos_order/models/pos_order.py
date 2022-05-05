# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError

class PosOrderLine(models.Model):
    _inherit = 'pos.order.line' 
    
    timer_expiration = fields.Char(string="Timer Expiration")
