
====1.2.7====
-------------
- changed linking docConstructor by extending (for default) 
and second parameter 'direct' for method setConstructor of UniCollection.
UniUsers.UniUser is still added directly (by reference)

====1.2.0====
-------------
- added observeCount on universe collection (server only)

====1.1.7====
-------------
- added getCollectionName

====1.1.2====
-------------
- bugfix

====1.1.0====
-------------
- Added auto registering of universe documents as the EJSON type
- Added ensureUniDoc on every universe collections

====1.0.7====
-------------
- UniUsers.ensureUniUser

====1.0.5====
-------------
- bugs fixes
- readme

====1.0.0====
-------------
- Moved Universe Collection from universe-core to this package
- Renamed user helper from user.hasPermissionOf<PermissionName>() to user.getPermission<PermissionName>()