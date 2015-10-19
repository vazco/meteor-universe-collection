if (typeof System !== 'undefined') {                                                                                   // 2
    System.set(System.normalizeSync('{universe:collection}'), System.newModule(UniUtils.assign({                       // 3
        UniCollection: UniCollection,                                                                                  // 4
        UniUsers: UniUsers,                                                                                            // 5
        UniDoc: UniCollection.UniDoc,                                                                                  // 6
        UniUser: UniUsers.UniUser,                                                                                     // 7
        'default': UniCollection                                                                                       // 8
    }, UniCollection.mixins)));                                                                                        //
}    