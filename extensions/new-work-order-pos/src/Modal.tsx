import { reactExtension } from '@shopify/ui-extensions-react/point-of-sale';
import { WorkMateApp } from '@work-orders/work-orders-pos-internals';

export default reactExtension('pos.home.modal.render', () => <WorkMateApp entrypoint={'NewWorkOrder'} />);
