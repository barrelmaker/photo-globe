import exifr from 'exifr';
import { useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import ImageUploading, { ImageListType } from 'react-images-uploading';
import './App.css';

type Photo = {
	id: string;
	latitude: number;
	longitude: number;
	url: string;
};

type Data = {
	data: {
		photoCollection: { edges: { node: Photo }[] };
	};
};

function App() {
	const markerSvg = `<svg viewBox="-4 0 36 36">
    <path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path>
    <circle fill="black" cx="14" cy="14" r="7"></circle>
  </svg>`;

	const [data, setData] = useState<Data>();
	const [photo, setPhoto] = useState<string>();
	const [images, setImages] = useState<ImageListType>([]);
	const maxNumber = 69;

	const GetAllPhotosQuery = /* GraphQL */ `
		query GetAllPhotos($first: Int!) {
			photoCollection(first: $first) {
				edges {
					node {
						id
						latitude
						longitude
						url
					}
				}
			}
		}
	`;

	const CreatePhotoMutation = /* GraphQL */ `
		mutation PhotoCreate($input: PhotoCreateInput!) {
			photoCreate(input: $input) {
				photo {
					url
					latitude
					longitude
					id
				}
			}
		}
	`;

	useEffect(() => {
		const fetchData = async () => {
			const response = await fetch('http://localhost:4000/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': ''
				},
				body: JSON.stringify({
					query: GetAllPhotosQuery,
					variables: {
						first: 100
					}
				})
			});

			const result = (await response.json()) as Data;
			setData(result);
		};

		fetchData();
	}, []);

	const gData: object[] | undefined = [];
	for (const d of data?.data.photoCollection.edges || []) {
		gData.push({
			id: d.node.id,
			lat: d.node.latitude,
			lng: d.node.longitude,
			size: 7 + Math.random() * 30,
			color: ['red', 'white', 'green'][Math.round(Math.random() * 3)],
			url: d.node.url
		});
	}

	return (
		<div className="App">
			<ImageUploading
				multiple
				value={images}
				onChange={onChange}
				maxNumber={maxNumber}
				dataURLKey="data_url"
			>
				{({
					imageList,
					onImageUpload,
					onImageRemoveAll,
					onImageUpdate,
					onImageRemove,
					isDragging,
					dragProps
				}) => (
					// write your building UI
					<div className="upload__image-wrapper">
						<button
							style={isDragging ? { color: 'red' } : undefined}
							onClick={onImageUpload}
							{...dragProps}
						>
							Click or Drop here
						</button>
						&nbsp;
						<button onClick={onImageRemoveAll}>Remove all images</button>
						{imageList.map((image, index) => (
							<div key={index} className="image-item">
								<img src={image['data_url']} alt="" width="100" />
								<div className="image-item__btn-wrapper">
									<button onClick={() => onImageUpdate(index)}>Update</button>
									<button onClick={() => onImageRemove(index)}>Remove</button>
								</div>
							</div>
						))}
					</div>
				)}
			</ImageUploading>

			<Globe
				globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
				htmlElementsData={gData}
				htmlElement={(d) => {
					const el = document.createElement('div');
					el.innerHTML = markerSvg;
					el.style.color = (d as any).color;
					el.style.width = `${(d as any).size}px`;

					el.style.pointerEvents = 'auto';
					el.style.cursor = 'pointer';
					el.onclick = () => setPhoto((d as any).url);
					return el;
				}}
			/>

			{photo && (
				<img src={photo} alt="" style={{ position: 'absolute', top: 100, left: 100, width: 200 }} />
			)}
		</div>
	);

	async function onChange(imageList: ImageListType, addUpdateIndex?: number[] | undefined) {
		const newIndex = addUpdateIndex ? addUpdateIndex[0] : 0;
		const newImage = imageList[newIndex];

		const { latitude, longitude } = await exifr.gps(newImage['data_url']);

		// Upload image files
		const res = await fetch('http://localhost:4000/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': ''
			},
			body: JSON.stringify({
				query: CreatePhotoMutation,
				variables: {
					input: {
						latitude,
						longitude,
						url: newImage['data_url']
					}
				}
			})
		});

		setImages(imageList);
	}
}

export default App;
