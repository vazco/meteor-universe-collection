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
            },
            autoform: {
                omit: true
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
            },
            autoform: {
                omit: true
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
            },
            autoform: {
                omit: true
            }
        },
        ownerId: {
            type: String,
            autoValue: function () {
                if (this.isInsert || this.isUpsert) {
                    return this.value || this.userId;
                }
            },
            optional: true,
            uniUI: {
                component: 'none'
            },
            autoform: {
                omit: true
            }
        },
        disabled: {
            type: Boolean,
            defaultValue: false,
            uniUI: {
                component: 'none'
            },
            autoform: {
                omit: true
            }
        }

    };
};
