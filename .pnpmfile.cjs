// pnpm configuration file
// This file helps configure pnpm behavior for the project

module.exports = {
  hooks: {
    readPackage(pkg) {
      // Allow build scripts for packages that need them
      if (['@prisma/client', '@prisma/engines', 'bcrypt', 'prisma'].includes(pkg.name)) {
        pkg.scripts = pkg.scripts || {};
      }
      return pkg;
    },
  },
};

