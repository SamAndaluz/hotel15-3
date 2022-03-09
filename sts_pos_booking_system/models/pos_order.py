from odoo import models, api
class PosOrder(models.Model):
    _inherit = 'pos.order'

    @api.model
    def get_booking_reservation_data(self, product_id, table_id=None):
        self = self.with_context(table_id=table_id)
        return super(PosOrder, self).get_booking_reservation_data(product_id)

    @api.model
    def update_booking_slots(self, product_id, new_date, table_id=None):
        self = self.with_context(table_id=table_id)
        return super(PosOrder, self).update_booking_slots(product_id, new_date)