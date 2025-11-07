// import { USER_DETAILS } from "constants/AuthConstant";

// export const hasPermission = (requiredPermissions) => {
//   const user = JSON.parse(localStorage.getItem(USER_DETAILS));
//   console.log('------ddddd')
//   if (!user || !user.permissions) return false;

//   // Agar super admin ho
//   if (user.permissions.includes("*")) return true;

//   // Agar koi required permission match kare
//   return requiredPermissions.some(p => user.permissions.includes(p));
// };

import { USER_DETAILS } from "constants/AuthConstant";

export const hasPermission = (requiredPermissions) => {
  const user = JSON.parse(localStorage.getItem(USER_DETAILS));
  // console.log('----user',user)
  if (!user || !user.permissions) return false;

  const userPerms = user.permissions || [];
  // console.log('------userPerms',userPerms)
  // Agar string pass hua, convert to array
  const perms = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];

  // 1️⃣ Full access (global)
  if (userPerms.includes("*")) return true;

  // 2️⃣ Module full access e.g. "*:role"
  const moduleFullAccess = perms.some(perm => {
    const [action, module] = perm.split(":");
    return userPerms.includes(`*:${module}`);
  });

  if (moduleFullAccess) return true;

  // 3️⃣ Specific permission
  return perms.some(perm => userPerms.includes(perm));
};

