// Same silhouette as BikeCard so nothing jumps when results arrive.
export default function BikeSkeleton() {
  return (
    <div className="hotel car" aria-hidden="true">
      <div className="media car-media sk" />
      <div className="hotel-body">
        <div className="sk sk-line" style={{ width: "60%" }} />
        <div className="sk sk-line" style={{ width: "45%" }} />
        <div className="sk sk-line" style={{ width: "75%" }} />
        <div className="price-row">
          <div className="sk sk-line" style={{ width: "38%", height: 28 }} />
          <div className="sk sk-pill" />
        </div>
      </div>
    </div>
  );
}
