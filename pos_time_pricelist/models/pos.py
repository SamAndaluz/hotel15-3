# -*- coding: utf-8 -*-


from odoo import fields, models,tools,api


class ProductPricelistItem(models.Model):
    _inherit = 'product.pricelist.item'

    start_time = fields.Float('Start Time')
    end_time = fields.Float('End Time')