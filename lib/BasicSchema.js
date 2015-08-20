'use strict';
/**
 * Proposal of basic schema for projects and plugins collections.
 * @returns {*}
 */
UniCollection.getBasicSchema = function () {
    return {
        createdAt: {
            type: Date,
            autoValue: function () {
                if (this.isInsert) {
                    return new Date();
                }
            },
            optional: true,
            uniUI: {
                component: 'none'
            }
        },
        updatedAt: {
            type: Date,
            autoValue: function () {
                if (this.isUpdate) {
                    return new Date();
                }
            },
            optional: true,
            uniUI: {
                component: 'none'
            }
        },
        lastModifiedBy: {
            type: String,
            optional: true,
            autoValue: function () {
                if (this.isUpdate) {
                    return this.value || this.userId;
                }
            },
            uniUI: {
                component: 'none'
            }
        },
        ownerId: {
            type: String,
            autoValue: function () {
                if (this.isInsert || this.isUpsert) {
                    return this.value || this.userId;
                }
            },
            uniUI: {
                component: 'none'
            }
        },
        disabled: {
            type: Boolean,
            defaultValue: false,
            uniUI: {
                component: 'none'
            }
        }

    };
};