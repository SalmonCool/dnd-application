/**
 * App.tsx - Root Application Component
 * =====================================
 * The main component that structures our D&D application.
 * This component is rendered by main.tsx and contains all other components.
 *
 * REACT COMPONENT BASICS:
 * -----------------------
 * A React component is a reusable piece of UI. Components can:
 *   - Accept inputs (called "props")
 *   - Manage their own data (called "state")
 *   - Return JSX (the HTML-like syntax you see below)
 *
 * This is a "functional component" - a function that returns JSX.
 * (The older style was "class components" - but functional is now preferred)
 */

/**
 * CSS Import
 * ----------
 * When you import CSS like this, it's automatically applied to this component
 * and any child components. The styles are NOT scoped by default - they're global.
 *
 * For scoped styles, React offers:
 *   - CSS Modules (Component.module.css)
 *   - Styled-components library
 *   - Tailwind CSS utility classes
 */
import './App.css'

/**
 * Named Import
 * ------------
 * Using { Scene } imports a specific export from the module.
 * This is different from "default" imports like: import Scene from './Scene'
 *
 * We set up the index.ts file in components/3d/ to re-export components,
 * making imports cleaner: './components/3d' instead of './components/3d/Scene'
 */
import { Scene } from './components/3d'

/**
 * App Component
 * -------------
 * This is a functional component. It's just a function that returns JSX.
 *
 * JSX BASICS:
 * - Looks like HTML but it's actually JavaScript
 * - Uses className instead of class (class is a reserved word in JS)
 * - All tags must be closed: <br /> not <br>
 * - You can embed JavaScript expressions with {curly braces}
 *
 * COMPONENT STRUCTURE:
 * - function name must start with a capital letter (App, not app)
 * - must return a single root element (or Fragment: <>...</>)
 * - export default makes this the main export of the file
 */
function App() {
  return (
    /**
     * The div.app container
     * ---------------------
     * This wraps our entire application layout.
     * Check App.css to see how it's styled with flexbox.
     */
    <div className="app">
      {/**
       * Header Section
       * --------------
       * Contains the application title.
       * The <header> tag is semantic HTML - it tells browsers and screen readers
       * "this is the header section of the page"
       */}
      <header className="header">
        <h1>D&D Application</h1>
      </header>

      {/**
       * Main Content Area
       * -----------------
       * <main> is semantic HTML for the primary content of the page.
       * Screen readers and SEO benefit from proper semantic tags.
       */}
      <main className="main">
        {/**
         * 3D Scene Container
         * ------------------
         * This div holds our React Three Fiber scene.
         * The Scene component (from components/3d) renders the 3D canvas.
         *
         * COMPONENT USAGE:
         * <Scene /> - Self-closing tag because we're not passing children.
         * Could also write: <Scene></Scene>
         */}
        <div className="scene-container">
          <Scene />
        </div>
      </main>
    </div>
  )
}

/**
 * Default Export
 * --------------
 * 'export default' means this is the main thing this file exports.
 * When another file does: import App from './App'
 * They get this component.
 *
 * You can also have named exports in the same file:
 *   export const someHelper = () => { ... }
 * Which would be imported as: import App, { someHelper } from './App'
 */
export default App
