import { Link } from "react-router-dom";

const Header = () => {
  return (
    <>
      <Link to="/">home</Link>
      <Link to="/dashboard">dashboard</Link>
      <Link to="/port">port</Link>
    </>
  );
};

export default Header;
