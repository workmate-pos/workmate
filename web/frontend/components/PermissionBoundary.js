import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { Loading } from '@shopify/app-bridge-react';
import { NoPermissionCard } from '@web/frontend/components/NoPermissionCard.js';
/**
 * Wrapper component that only shows children if the user has the required permissions.
 */
export function PermissionBoundary({ children, permissions }) {
    var _a, _b;
    const [toast, setToastAction] = useToast();
    const fetch = useAuthenticatedFetch({ setToastAction });
    const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
    if (currentEmployeeQuery.isLoading) {
        return (<>
        <Loading />
        {toast}
      </>);
    }
    const superuser = (_b = (_a = currentEmployeeQuery.data) === null || _a === void 0 ? void 0 : _a.superuser) !== null && _b !== void 0 ? _b : false;
    const missingEmployeePermissions = superuser
        ? []
        : permissions.filter(permission => { var _a, _b; return !((_b = (_a = currentEmployeeQuery.data) === null || _a === void 0 ? void 0 : _a.permissions) === null || _b === void 0 ? void 0 : _b.includes(permission)); });
    if (missingEmployeePermissions.length > 0 && !superuser) {
        return (<>
        <NoPermissionCard missingPermissions={missingEmployeePermissions}/>
        {toast}
      </>);
    }
    return (<>
      {children}
      {toast}
    </>);
}
