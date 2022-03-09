# -*- coding: utf-8 -*-
#################################################################################
# Author      : Webkul Software Pvt. Ltd. (<https://webkul.com/>)
# Copyright(c): 2015-Present Webkul Software Pvt. Ltd.
# License URL : https://store.webkul.com/license.html/
# All Rights Reserved.
#
#
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#
# You should have received a copy of the License along with this program.
# If not, see <https://store.webkul.com/license.html/>
#################################################################################
from odoo import api, http, tools, _
from odoo.http import request
from datetime import date, timedelta, datetime
from odoo.addons.website_sale.controllers.main import WebsiteSale

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

class WebsiteSale(WebsiteSale):

    @http.route(['/shop/cart/update'], type='http', auth="public", methods=['POST'], website=True, csrf=False)
    def cart_update(self, product_id, add_qty=1, set_qty=0, **kw):
        _logger.info("**********kwwww**********%r",kw)
        res = super(WebsiteSale, self).cart_update(product_id, add_qty, set_qty, **kw)
        bk_plan = kw.get('bk_plan', False)
        bk_date = kw.get('bk_date', False)

        if bk_plan:
            bk_slot_obj = request.env["booking.slot"].browse([int(bk_plan)])
            sale_order = request.website.sale_get_order()
            order_line = sale_order.order_line.filtered(lambda l: l.product_id.id == int(product_id))
            slot_id = request.env['booking.slot']
            if bk_plan:
                slot_id = request.env['booking.slot'].browse(int(bk_plan))
            _logger.info("*slot_id****%r****int(bk_plan)**%r",int(bk_plan),slot_id)
            order_line.write({
                'booking_slot_ids'  :   [(6,0,[int(bk_plan)])],
                # 'booked_slot_id':time_slots[min_time],
                'product_uom_qty'   :   int(add_qty) or 1,
                'booked_plan_id'    :   [(6,0,[slot_id.plan_id.id])],
                'price_unit'        :   slot_id.price,
                'booking_date'      :   bk_date if bk_date else None,
            })
            sale_order.write({
                'is_booking_type': True,
            })
        return res


    # @http.route(['/shop/cart/update'], type='http', auth="public", methods=['POST'], website=True, csrf=False)
    # def cart_update(self, product_id, add_qty=1, set_qty=0, **kw):
    #     res = super(WebsiteSale, self).cart_update(product_id, add_qty, set_qty, **kw)
    #     final_selected_slot = kw.get('final_selected_slot',None)
    #     if final_selected_slot and len(final_selected_slot)>0:
    #         bk_plan = list(map(int,final_selected_slot.strip().split(',')))
    #         bk_plan = request.env["booking.slot"].sudo().browse(bk_plan) or False
            
    #         bk_date = kw.get('bk_date', False)
    #         bk_date = datetime.strptime(bk_date,'%m/%d/%Y').date() if bk_date else None
    #         total_price = sum(bk_plan.mapped('price'))
    #         if bk_plan:
    #             sale_order = request.website.sale_get_order()
    #             order_line = sale_order.order_line.filtered(lambda l: l.product_id.id == int(product_id))
                
    #             order_line.write({
    #                 'booking_slot_ids'  :   [(6,0,bk_plan.ids)],
    #                 # 'booked_slot_id':time_slots[min_time],
    #                 'product_uom_qty'   :   int(add_qty) or 1,
    #                 'booked_plan_id'    :   [(6,0,bk_plan.mapped('plan_id').ids)],
    #                 'price_unit'        :   total_price,
    #                 'booking_date'      :   bk_date if bk_date else None,
    #             })
    #             if not sale_order.is_booking_type:
    #                 sale_order.write({
    #                     'is_booking_type': True,
    #                 })
    #     return res
