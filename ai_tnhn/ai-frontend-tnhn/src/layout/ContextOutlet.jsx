import { Outlet, useOutletContext } from 'react-router-dom';

const ContextOutlet = () => {
    const context = useOutletContext();
    return <Outlet context={context} />;
};

export default ContextOutlet;
