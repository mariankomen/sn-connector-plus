import { useState } from "react";
import type { IRecordModalProps } from "../interfaces/IRecordModal";
import styles from "./Link.module.css";
import Details from "./RecordView/Details";
import Feeds from "./RecordView/Feeds";
import RelatedTab from "./RecordView/RelatedTab";

type TabType = "details" | "related" | "feeds";

const RecordModal = ({ sf_object_type, sf_record_id }: IRecordModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("details");

  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        return (
            <Details sf_object_type={sf_object_type} sf_record_id={sf_record_id} />
        );
      case "related":
        return (
          <RelatedTab sf_object_type={sf_object_type} sf_record_id={sf_record_id} />
        );
      case "feeds":
        return (
          <Feeds sf_object_type={sf_object_type} sf_record_id={sf_record_id} />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className={styles.modalTabs}>
        <button
          className={`${styles.tabButton} ${activeTab === "details" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "related" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("related")}
        >
          Related
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "feeds" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("feeds")}
        >
          Feeds
        </button>
      </div>
      <div className={styles.modalBody}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default RecordModal;