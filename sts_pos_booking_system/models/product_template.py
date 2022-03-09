from odoo import models, api
import logging
_logger = logging.getLogger(__name__)


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    @api.model
    def get_bk_slot_available_qty(self, bk_date, slot_plan_id):
        """ Return: Total quantity available on a particular date in a provided slot.
            bk_date: Date on with quantity will be calculated.
            slot_plan_id: Plan in any slot on with quantity will be calculated."""

        table_id = self._context.get('table_id', None)
        booking_slot = self.env["booking.slot"].browse([int(slot_plan_id)])
        domain = [('booking_date','=',bk_date),
                  ('state', '!=', 'cancel'),
                  ('plan_id', '=', booking_slot.plan_id.id),
                  ]
        if table_id:
            domain += [('table_id', '=', table_id)]
        booking_orders = self.env['booking.order'].search(domain)
        b_orders = booking_orders.filtered(lambda l: booking_slot.time_slot_id.id in l.time_slot_ids.ids)
        return booking_slot.quantity - sum(b_orders.mapped('quantity'))
