# -*- coding: utf-8 -*-

from odoo import fields, models,tools,api,_

class PosConfig(models.Model):
    _inherit = 'pos.config' 
    
    allow_timer_product = fields.Boolean(string="Allow timer Product",default=True)
    show_seconds = fields.Boolean(string="Show Seconds in timer",default=True)

class ProductTemplate(models.Model):
    _inherit = 'product.template' 
    
    is_timer_product = fields.Boolean(string="Is timer Product")


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line' 
    
    start_time = fields.Char(string="Start Time")
    stop_time = fields.Char(string="Stop Time")
    hours = fields.Char(string="Hours")
    minutes = fields.Char(string="Minutes")
    seconds = fields.Char(string="Seconds")
    total_time = fields.Char(string="Total Time")

