import { Link } from 'react-router'
import { FaExclamationTriangle, FaHome } from 'react-icons/fa'

// 404-es oldal az ismeretlen útvonalakhoz.
// Az nginx minden ismeretlen útvonalra az index.html-t adja (SPA fallback),
// így a "nem található" oldalt a React Router jeleníti meg.
const NotFound = () => {
  return (
    <>
      <section className='heading'>
        <h1>
          <FaExclamationTriangle /> 404
        </h1>
        <p>Sorry, the page you are looking for does not exist</p>
      </section>

      <Link to='/' className='btn btn-reverse btn-block'>
        <FaHome /> Back to Home
      </Link>
    </>
  )
}

export default NotFound
