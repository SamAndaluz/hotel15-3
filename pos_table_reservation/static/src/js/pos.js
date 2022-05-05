odoo.define('pos_table_reservation', function (require) {
"use strict";

    var models = require('point_of_sale.models');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const FloorScreen = require('pos_restaurant.FloorScreen');
    const { useListener } = require('web.custom_hooks');
    const { useState } = owl.hooks;

    models.load_fields('restaurant.table',['is_reserved','reserve_note','old_color']);


    class EditBar2 extends PosComponent {
        constructor() {
            super(...arguments);
            this.state = useState({ isColorPicker: false })
        }
    }
    EditBar2.template = 'EditBar2';
    Registries.Component.add(EditBar2);

    const PosResFloorScreen = FloorScreen =>
        class extends FloorScreen {
            constructor() {
                super(...arguments);
                useListener('merge-table', this._mergeTable);
                useListener('split-table', this._splitTable);

                this.selectedTableId =  0;
            }
            async _mergeTable(){
                var self = this;
                var selected_tables= [];
                if (this.selectedTableId > 0) {
                    var selectedTable = this.env.pos.tables_by_id[this.selectedTableId];
                    const { confirmed, payload: newName } = await this.showPopup('TextInputPopup', {
                        startingValue:"",
                        title: this.env._t('Table Reservation Note'),
                    });
                    if (confirmed) {
                        var default_color = self.env.pos.config.reserve_table_color;
                        self.rpc({
                            model: 'restaurant.table',
                            method: 'write',
                            args: [[selectedTable.id], {'is_reserved':true,'old_color':selectedTable.color,'color':default_color,'reserve_note':newName}],
                        }).then(function (result) {
                            selectedTable.reserve_note = newName;
                            selectedTable.is_reserved = true;
                            selectedTable.old_color = selectedTable.color;
                            selectedTable.color = default_color;
                            self.toggleSplitMerge();
                        }); 

                    }
                }
                else{
                    alert("Please select the table.");
                }
            }
            _splitTable(){
                var self = this;
                if (this.selectedTableId > 0) {
                    var selected_table = this.env.pos.tables_by_id[this.selectedTableId];
                    var default_color = self.env.pos.config.reserve_table_color;
                    self.rpc({
                        model: 'restaurant.table',
                        method: 'write',
                        args: [[selected_table.id], {'is_reserved':false,'old_color':"",'color':selected_table.old_color,'reserve_note':""}],
                    }).then(function (result) {
                    });
                    selected_table.reserve_note = "";
                    selected_table.is_reserved = false;
                    selected_table.color = selected_table.old_color;
                    selected_table.old_color = "";
                    self.toggleSplitMerge();

                }
                else{
                    alert("Please select the table first.");
                }
            }
            toggleSplitMerge() {
                this.state.isEditMode2 = !this.state.isEditMode2;
                this.state.selectedTableId = null;
                this.selectedTableId = [];
            }
            _onSelectTable(event) {

                const table = event.detail;
                if (this.state.isEditMode) {
                    this.state.selectedTableId = table.id;
                }
                else if (this.state.isEditMode2) {
                    this.state.selectedTableId = table.id;
                    this.selectedTableId = table.id
                } else {
                    this.env.pos.set_table(table);
                }
            }

            check_table(table_id){
                var selectedTableId = this.selectedTableId;
                for(var i=0;i<selectedTableId.length;i++){
                    if(selectedTableId[i] == table_id){
                        return false;
                    }
                }
                if(this.state.selectedTableId == table_id){
                    return false;
                }
                return true;
            }
        };

    Registries.Component.extend(FloorScreen, PosResFloorScreen);
    
    var PosModelSuper = models.PosModel;
    models.PosModel = models.PosModel.extend({
        set_table: function(table) {
            if(table && table.is_reserved){                
                alert("Sorry this Table is already Reserved.");
            }
            else{
                PosModelSuper.prototype.set_table.apply(this,arguments);
            }
        },
    });
});

