const checkKnownProblems = () => {
    const problematicPackages = ['aldeed:collection2', 'matb33:collection-hooks'];
    return problematicPackages.some(pn => !!Package[pn]);
};

if (!Package['universe:fixes-for-third-party-packages'] && checkKnownProblems()) {
    console.warn('Detected possible problems with third party package, please install universe:fixes-for-third-party-packages');
}

if (Package['vazco:universe-collection']) {
    console.warn('Detected possible problems with old package "vazco:universe-collection", please remove all dependency for this package (it can be a dependency from other package)');
}