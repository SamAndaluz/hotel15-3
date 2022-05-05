# -*- coding: utf-8 -*-

from odoo import fields, models,tools,api

class pos_config(models.Model):
    _inherit = 'pos.config' 

    allow_table_reservation = fields.Boolean('Allow Table Reservation', default=True)
    reserve_table_color = fields.Char("Table Reservation Color",default="#FF0000")

class RestaurantTable(models.Model):
    _inherit = 'restaurant.table'

    is_reserved = fields.Boolean(string='Is Reserved')
    reserve_note  = fields.Char(string='Reservation Note')
    old_color = fields.Char(string='Old Color')


