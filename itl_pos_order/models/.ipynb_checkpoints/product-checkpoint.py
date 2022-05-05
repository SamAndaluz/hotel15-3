# -*- coding: utf-8 -*-

from odoo import _, api, fields, models
from odoo.exceptions import UserError

class ProductProduct(models.Model):
    _inherit = 'product.product'


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    order_type_id = fields.Many2one(string='Default Order Type', comodel_name='ob.order.type')

