import type { FC, ReactNode } from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  /** The page title. */
  title: string;
  /**
   * Optional short description rendered under the title as a
   * subtitle. Mirrors the layout used by the other showcase
   * apps (e.g. supply-chain Operations / Executive Command
   * Center) so every routed page opens with the same
   * title + one-line context strip.
   */
  description?: string;
  /** Optional right-aligned action area. */
  actions?: ReactNode;
}

/**
 * Page header shared by every routed page — page title,
 * optional one-line subtitle, and a right-aligned action
 * area. The breadcrumb previously rendered here has been
 * promoted to the AppBar (rendered to the right of the
 * leading nav toggle) so the trail sits next to the chrome
 * that controls navigation.
 */
const PageHeader: FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <header className="page-header">
      <div className="page-header__meta">
        <h1 className="page-header__title">{title}</h1>
        {description ? (
          <p className="page-header__description">{description}</p>
        ) : null}
      </div>
      {/* {actions ? <div className="page-header__actions">{actions}</div> : null} */}
    </header>
  );
};

export default PageHeader;
